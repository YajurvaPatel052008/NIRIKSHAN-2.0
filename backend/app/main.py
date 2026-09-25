from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api.routes.analyses import router as analyses_router
from app.api.routes.standards import router as standards_router
from app.api.routes.standards_graph import router as standards_graph_router
from app.core.config import settings
from app.db.base import SessionLocal
from app.db.init_db import init_db
from app.models import Standard
from app.services.embedding_service import load_embedding_model, reindex_all_standards
from app.services.graph_service import rebuild_graph
from sqlalchemy import select, text


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with SessionLocal() as session:
        has_standards = session.scalar(select(Standard.id).limit(1)) is not None
        if has_standards:
            load_embedding_model()
        has_missing_embeddings = session.scalar(
            select(Standard.id)
            .where(Standard.embedding.is_(None))
            .limit(1)
        ) is not None
        if has_missing_embeddings:
            reindex_all_standards(session)
        rebuild_graph(session)
    yield


app = FastAPI(title="NIRIKSHAN API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(analyses_router)
app.include_router(standards_router)
app.include_router(standards_graph_router)


@app.get("/health")
def health() -> dict[str, str]:
    with SessionLocal() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
