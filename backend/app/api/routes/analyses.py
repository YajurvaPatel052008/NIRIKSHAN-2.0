from fastapi import APIRouter, Depends, HTTPException, status
import logging
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.security import require_role
from app.db.base import SessionLocal
from app.models import Analysis, AnalysisStatus, User, UserRole
from app.api.routes.analysis_recommendations import router as recommendations_router
from app.services.document_parser import get_temporary_document
from app.services.requirement_extractor import extract_requirements

router = APIRouter(prefix="/api/analyses", tags=["analyses"])
router.include_router(recommendations_router)
LOGGER = logging.getLogger(__name__)


class AnalysisRequest(BaseModel):
    title: str
    raw_text: str | None = None
    document_id: str | None = None


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    raw_input_text: str
    extracted_requirements: dict
    status: AnalysisStatus
    created_at: datetime | None = None


class AnalysisUpdateRequest(BaseModel):
    title: str | None = None
    extracted_requirements: dict | None = None


def _can_access(analysis: Analysis, current_user: User) -> bool:
    return (
        current_user.role in {UserRole.REVIEWER, UserRole.ADMIN}
        or analysis.user_id == current_user.id
    )


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
def create_analysis(
    payload: AnalysisRequest,
    current_user: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> Analysis:
    if bool(payload.raw_text) == bool(payload.document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one of raw_text or document_id",
        )

    raw_text = payload.raw_text
    if payload.document_id:
        raw_text = get_temporary_document(payload.document_id)
        if raw_text is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Temporary document not found or expired",
            )

    try:
        requirements = extract_requirements(raw_text or "")
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        LOGGER.exception("Unexpected requirement extraction failure")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Requirement extraction failed unexpectedly. "
                "Please try again with a more complete product description."
            ),
        ) from exc

    with SessionLocal() as session:
        analysis = Analysis(
            user_id=current_user.id,
            title=payload.title,
            raw_input_text=raw_text or "",
            input_language="unknown",
            extracted_requirements=requirements.model_dump(),
            status=AnalysisStatus.ANALYZED,
        )
        session.add(analysis)
        session.commit()
        session.refresh(analysis)
        session.expunge(analysis)
        return analysis


@router.get("", response_model=list[AnalysisResponse])
def list_analyses(
    current_user: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> list[Analysis]:
    with SessionLocal() as session:
        query = select(Analysis).order_by(Analysis.created_at.desc(), Analysis.id.desc())
        if current_user.role == UserRole.OFFICER:
            query = query.where(Analysis.user_id == current_user.id)
        rows = session.scalars(query).all()
        return rows


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> Analysis:
    with SessionLocal() as session:
        analysis = session.get(Analysis, analysis_id)
        if analysis is None or not _can_access(analysis, current_user):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        session.expunge(analysis)
        return analysis


@router.patch("/{analysis_id}", response_model=AnalysisResponse)
def update_analysis(
    analysis_id: int,
    payload: AnalysisUpdateRequest,
    current_user: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> Analysis:
    with SessionLocal() as session:
        analysis = session.get(Analysis, analysis_id)
        if analysis is None or not _can_access(analysis, current_user):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        if payload.title is not None:
            if not payload.title.strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title cannot be empty")
            analysis.title = payload.title.strip()
        if payload.extracted_requirements is not None:
            analysis.extracted_requirements = payload.extracted_requirements
        session.commit()
        session.refresh(analysis)
        session.expunge(analysis)
        return analysis
