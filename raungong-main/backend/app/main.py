from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.meta import router as meta_router
from app.api.v1.plans import router as plans_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.models.user import User  # noqa: F401
from app.models.plan import Plan  # noqa: F401
from app.models.task import GenerationTask  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    Path("data").mkdir(exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(meta_router, prefix="/api/v1")
app.include_router(plans_router, prefix="/api/v1")


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "service": "activity-mind",
        "agent": {
            "provider": settings.agent_provider,
            "configured": settings.agent_configured,
        },
    }