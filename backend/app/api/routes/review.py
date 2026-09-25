from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.core.security import require_role
from app.db.base import SessionLocal
from app.models import (
    Analysis,
    AnalysisStatus,
    AuditLog,
    Recommendation,
    ReviewerDecision,
    Standard,
    User,
    UserRole,
)
from app.services.export_service import (
    generate_specification_docx,
    generate_specification_json,
)

router = APIRouter(tags=["review"])


class ReviewDecisionRequest(BaseModel):
    decision: Literal["accepted", "edited", "rejected"]
    notes: str = ""
    edited_fields: dict | None = None


class AuditHistoryResponse(BaseModel):
    id: int
    analysis_id: int
    user_id: int
    action: str
    details: dict
    timestamp: str | None


def _accepted_recommendations(session, analysis_id: int) -> list[Recommendation]:
    return session.scalars(
        select(Recommendation)
        .where(
            Recommendation.analysis_id == analysis_id,
            Recommendation.reviewer_decision.in_(
                [ReviewerDecision.ACCEPTED, ReviewerDecision.EDITED]
            ),
        )
        .order_by(Recommendation.rank)
    ).all()


@router.patch("/api/recommendations/{recommendation_id}/decision")
def update_decision(
    recommendation_id: int,
    payload: ReviewDecisionRequest,
    current_user: User = Depends(
        require_role(UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> dict:
    with SessionLocal() as session:
        recommendation = session.get(Recommendation, recommendation_id)
        if recommendation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

        recommendation.reviewer_decision = ReviewerDecision(payload.decision)
        recommendation.reviewer_notes = payload.notes
        details = {
            "recommendation_id": recommendation.id,
            "decision": payload.decision,
            "notes": payload.notes,
            "edited_fields": payload.edited_fields,
        }
        session.add(
            AuditLog(
                analysis_id=recommendation.analysis_id,
                user_id=current_user.id,
                action="reviewed",
                details=details,
            )
        )
        session.commit()
        return {"id": recommendation.id, "decision": payload.decision, "notes": payload.notes}


@router.get("/api/analyses/{analysis_id}/audit-history", response_model=list[AuditHistoryResponse])
def audit_history(
    analysis_id: int,
    _: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> list[AuditHistoryResponse]:
    with SessionLocal() as session:
        if session.get(Analysis, analysis_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        rows = session.scalars(
            select(AuditLog)
            .where(AuditLog.analysis_id == analysis_id)
            .order_by(AuditLog.timestamp, AuditLog.id)
        ).all()
        return [
            AuditHistoryResponse(
                id=row.id,
                analysis_id=row.analysis_id,
                user_id=row.user_id,
                action=row.action,
                details=row.details or {},
                timestamp=row.timestamp.isoformat() if row.timestamp else None,
            )
            for row in rows
        ]


@router.post("/api/analyses/{analysis_id}/export")
def export_analysis(
    analysis_id: int,
    format: Literal["docx", "json"] = Query(...),
    current_user: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
):
    with SessionLocal() as session:
        analysis = session.get(Analysis, analysis_id)
        if analysis is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        accepted = _accepted_recommendations(session, analysis_id)
        if not accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No accepted or edited recommendations are available for export",
            )
        for recommendation in accepted:
            recommendation.standard = session.get(Standard, recommendation.standard_id)

        session.add(
            AuditLog(
                analysis_id=analysis_id,
                user_id=current_user.id,
                action="exported",
                details={"format": format, "recommendation_count": len(accepted)},
            )
        )
        analysis.status = AnalysisStatus.EXPORTED
        session.commit()

        if format == "json":
            return generate_specification_json(analysis, accepted)

        path = generate_specification_docx(analysis, accepted)
        return FileResponse(
            path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename="NIRIKSHAN-tender-specification.docx",
        )
