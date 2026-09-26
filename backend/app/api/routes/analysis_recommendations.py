from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.security import require_role
from app.db.base import SessionLocal
from app.models import Analysis, Recommendation, Standard, User, UserRole
from app.services.analysis_pipeline import run_analysis_pipeline
from app.services.ranking_service import generate_explanation
from app.services.validation_service import check_version_status, get_certification_guidance

router = APIRouter(tags=["recommendations"])


class RecommendationResponse(BaseModel):
    id: int
    standard_id: int
    is_number: str
    title: str
    rank: int
    confidence_score: float
    relationship_type: str | None
    explanation: str
    version_status: dict
    certification_guidance: dict
    evidence: list[dict]
    semantic_similarity: float | None = None
    parameter_coverage: float | None = None
    reviewer_decision: str = "pending"


def _recommendation_response(
    recommendation: Recommendation,
    standard: Standard,
) -> RecommendationResponse:
    evidence = recommendation.evidence_snippets or []
    relationship_type = (
        recommendation.relationship_type.value
        if recommendation.relationship_type
        else None
    )
    explanation = generate_explanation(
        standard,
        {
            "evidence": [item.get("text", "") for item in evidence],
            "relationship_type": relationship_type,
        },
    )
    return RecommendationResponse(
        id=recommendation.id,
        standard_id=standard.id,
        is_number=standard.is_number,
        title=standard.title,
        rank=recommendation.rank,
        confidence_score=recommendation.confidence_score,
        relationship_type=relationship_type,
        explanation=explanation,
        version_status=check_version_status(standard),
        certification_guidance=get_certification_guidance(standard),
        evidence=evidence,
        semantic_similarity=recommendation.semantic_similarity,
        parameter_coverage=recommendation.parameter_coverage,
        reviewer_decision=(
            recommendation.reviewer_decision.value
            if recommendation.reviewer_decision
            else "pending"
        ),
    )


@router.post("/{analysis_id}/run", response_model=list[RecommendationResponse])
def run_analysis(
    analysis_id: int,
    _: User = Depends(
        require_role(UserRole.OFFICER, UserRole.ADMIN)
    ),
) -> list[RecommendationResponse]:
    with SessionLocal() as session:
        analysis = session.get(Analysis, analysis_id)
        if analysis is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        results = run_analysis_pipeline(analysis, session)
        return [_recommendation_response(item["recommendation"], item["standard"]) for item in results]


@router.get("/{analysis_id}/recommendations", response_model=list[RecommendationResponse])
def get_recommendations(
    analysis_id: int,
    _: User = Depends(
        require_role(UserRole.OFFICER, UserRole.ADMIN)
    ),
) -> list[RecommendationResponse]:
    with SessionLocal() as session:
        if session.get(Analysis, analysis_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
        rows = session.execute(
            select(Recommendation, Standard)
            .join(Standard, Standard.id == Recommendation.standard_id)
            .where(Recommendation.analysis_id == analysis_id)
            .order_by(Recommendation.rank)
        ).all()
        return [_recommendation_response(recommendation, standard) for recommendation, standard in rows]
