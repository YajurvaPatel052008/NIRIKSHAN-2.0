import json
from functools import lru_cache
from typing import Any

from sentence_transformers import SentenceTransformer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Standard

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


def load_embedding_model() -> None:
    """Load the local embedding model once for the application process."""
    _get_model()


def build_standard_embedding_text(standard: Standard) -> str:
    aliases = ", ".join(standard.aliases or [])
    technical_parameters = json.dumps(
        standard.technical_parameters or {},
        sort_keys=True,
        ensure_ascii=True,
    )
    return " ".join(
        part
        for part in (
            standard.title,
            standard.scope,
            standard.product_domain,
            aliases,
            technical_parameters,
        )
        if part
    )


def _embed(text: str) -> list[float]:
    embedding = _get_model().encode(text, normalize_embeddings=True)
    return embedding.tolist()


def embed_and_store_standard(standard: Standard, db_session: Session) -> None:
    standard.embedding = _embed(build_standard_embedding_text(standard))
    db_session.add(standard)
    db_session.commit()


def reindex_all_standards(db_session: Session) -> int:
    standards = db_session.scalars(select(Standard)).all()
    for standard in standards:
        embed_and_store_standard(standard, db_session)
    return len(standards)


def semantic_search(
    query_text: str,
    db_session: Session,
    top_k: int = 10,
) -> list[tuple[int, float]]:
    if not query_text.strip():
        return []
    if top_k < 1:
        raise ValueError("top_k must be greater than zero")

    query_embedding = _embed(query_text)
    distance = Standard.embedding.cosine_distance(query_embedding)
    rows = db_session.execute(
        select(Standard.id, distance.label("distance"))
        .where(Standard.embedding.is_not(None))
        .order_by(distance)
        .limit(top_k)
    ).all()
    return [(standard_id, max(0.0, min(1.0, 1.0 - distance))) for standard_id, distance in rows]
