from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select

from app.core.security import require_role
from app.db.base import SessionLocal
from app.models import (
    Analysis,
    AuditLog,
    Recommendation,
    Standard,
    StandardRelationship,
    StandardRelationshipType,
    User,
    UserRole,
)
from app.services.embedding_service import embed_and_store_standard
from app.services.graph_service import rebuild_graph

router = APIRouter(tags=["admin"])
admin_only = Depends(require_role(UserRole.ADMIN))


class StandardPayload(BaseModel):
    is_number: str
    title: str
    scope: str | None = None
    product_domain: str | None = None
    aliases: list[str] = Field(default_factory=list)
    technical_parameters: dict[str, Any] = Field(default_factory=dict)
    version_edition: str | None = None
    amendments: list[Any] = Field(default_factory=list)
    certification_metadata: dict[str, Any] = Field(default_factory=dict)
    source_reference: str | None = None


class StandardResponse(StandardPayload):
    model_config = ConfigDict(from_attributes=True)

    id: int


class RelationshipPayload(BaseModel):
    to_standard_id: int
    relationship_type: StandardRelationshipType


class RelationshipResponse(BaseModel):
    id: int
    from_standard_id: int
    to_standard_id: int
    relationship_type: StandardRelationshipType


class AuditLogResponse(BaseModel):
    id: int
    analysis_id: int
    user_id: int
    action: str
    details: dict[str, Any]
    timestamp: str | None


class AdminStatsResponse(BaseModel):
    total_standards: int
    total_analyses: int
    total_recommendations: int
    acceptance_rate: float


@router.post(
    "/api/admin/standards",
    response_model=StandardResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_standard(payload: StandardPayload, _: User = admin_only) -> Standard:
    with SessionLocal() as session:
        if session.scalar(
            select(Standard).where(Standard.is_number == payload.is_number)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A standard with this IS number already exists",
            )
        standard = Standard(**payload.model_dump())
        session.add(standard)
        session.commit()
        session.refresh(standard)
        embed_and_store_standard(standard, session)
        rebuild_graph(session)
        session.refresh(standard)
        session.expunge(standard)
        return standard


@router.put("/api/admin/standards/{standard_id}", response_model=StandardResponse)
def update_standard(
    standard_id: int,
    payload: StandardPayload,
    _: User = admin_only,
) -> Standard:
    with SessionLocal() as session:
        standard = session.get(Standard, standard_id)
        if standard is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
        if payload.is_number != standard.is_number and session.scalar(
            select(Standard).where(Standard.is_number == payload.is_number)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A standard with this IS number already exists",
            )
        old_embedding_text = (
            standard.title,
            standard.scope,
            standard.product_domain,
            standard.aliases,
            standard.technical_parameters,
        )
        for field, value in payload.model_dump().items():
            setattr(standard, field, value)
        new_embedding_text = (
            standard.title,
            standard.scope,
            standard.product_domain,
            standard.aliases,
            standard.technical_parameters,
        )
        session.commit()
        if old_embedding_text != new_embedding_text:
            embed_and_store_standard(standard, session)
        rebuild_graph(session)
        session.refresh(standard)
        session.expunge(standard)
        return standard


@router.post(
    "/api/admin/standards/{standard_id}/relationships",
    response_model=RelationshipResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_relationship(
    standard_id: int,
    payload: RelationshipPayload,
    _: User = admin_only,
) -> StandardRelationship:
    with SessionLocal() as session:
        if session.get(Standard, standard_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source standard not found")
        if session.get(Standard, payload.to_standard_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target standard not found")
        existing = session.scalar(
            select(StandardRelationship).where(
                StandardRelationship.from_standard_id == standard_id,
                StandardRelationship.to_standard_id == payload.to_standard_id,
                StandardRelationship.relationship_type == payload.relationship_type,
            )
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This standard relationship already exists",
            )
        relationship = StandardRelationship(
            from_standard_id=standard_id,
            to_standard_id=payload.to_standard_id,
            relationship_type=payload.relationship_type,
        )
        session.add(relationship)
        session.commit()
        session.refresh(relationship)
        rebuild_graph(session)
        session.expunge(relationship)
        return relationship


@router.get("/api/admin/audit-logs", response_model=list[AuditLogResponse])
def get_audit_logs(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _: User = admin_only,
) -> list[AuditLogResponse]:
    with SessionLocal() as session:
        rows = session.scalars(
            select(AuditLog)
            .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
            .offset(offset)
            .limit(limit)
        ).all()
        return [
            AuditLogResponse(
                id=row.id,
                analysis_id=row.analysis_id,
                user_id=row.user_id,
                action=row.action,
                details=row.details or {},
                timestamp=row.timestamp.isoformat() if row.timestamp else None,
            )
            for row in rows
        ]


@router.get("/api/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats(_: User = admin_only) -> AdminStatsResponse:
    with SessionLocal() as session:
        total_standards = session.scalar(select(func.count(Standard.id))) or 0
        total_analyses = session.scalar(select(func.count(Analysis.id))) or 0
        total_recommendations = session.scalar(select(func.count(Recommendation.id))) or 0
        accepted = session.scalar(
            select(func.count(Recommendation.id)).where(
                Recommendation.reviewer_decision == "accepted"
            )
        ) or 0
        rejected = session.scalar(
            select(func.count(Recommendation.id)).where(
                Recommendation.reviewer_decision == "rejected"
            )
        ) or 0
        edited = session.scalar(
            select(func.count(Recommendation.id)).where(
                Recommendation.reviewer_decision == "edited"
            )
        ) or 0
        reviewed_total = accepted + rejected + edited
        return AdminStatsResponse(
            total_standards=total_standards,
            total_analyses=total_analyses,
            total_recommendations=total_recommendations,
            acceptance_rate=round(accepted / reviewed_total, 4) if reviewed_total else 0.0,
        )
