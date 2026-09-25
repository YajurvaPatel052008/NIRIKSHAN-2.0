from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.core.security import require_role
from app.db.base import SessionLocal
from app.models import Standard, User, UserRole
from app.services.embedding_service import semantic_search

router = APIRouter(prefix="/api/standards", tags=["standards"])


class StandardSearchResult(BaseModel):
    id: int
    is_number: str
    title: str
    product_domain: str | None
    similarity_score: float


@router.get("/search", response_model=list[StandardSearchResult])
def search_standards(
    q: str = Query(min_length=1),
    top_k: int = Query(default=10, ge=1, le=50),
    _: User = Depends(
        require_role(UserRole.OFFICER, UserRole.REVIEWER, UserRole.ADMIN)
    ),
) -> list[StandardSearchResult]:
    with SessionLocal() as session:
        matches = semantic_search(q, session, top_k=top_k)
        if not matches:
            return []

        ids = [standard_id for standard_id, _ in matches]
        standards = {
            standard.id: standard
            for standard in session.scalars(
                select(Standard).where(Standard.id.in_(ids))
            ).all()
        }
        return [
            StandardSearchResult(
                id=standard.id,
                is_number=standard.is_number,
                title=standard.title,
                product_domain=standard.product_domain,
                similarity_score=score,
            )
            for standard_id, score in matches
            if (standard := standards.get(standard_id)) is not None
        ]
