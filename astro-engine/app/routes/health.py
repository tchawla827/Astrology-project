from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.deps.auth import require_hmac
from app.versioning import ENGINE_VERSION

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    engine_version: str


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", engine_version=ENGINE_VERSION)


@router.post("/health", dependencies=[Depends(require_hmac)], response_model=HealthResponse)
def protected_health() -> HealthResponse:
    return HealthResponse(status="ok", engine_version=ENGINE_VERSION)
