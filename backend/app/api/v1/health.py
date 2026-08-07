"""Health endpoint — platform health check (Phase 3.1 deliverable).

GET /api/v1/health
{
    "status": "healthy",
    "service": "ForgeAI Studio",
    "version": "1.0.0"
}
"""

from fastapi import APIRouter

from app.config.constants import SERVICE_NAME, VERSION
from app.schemas.health import HealthResponse

health_router = APIRouter(tags=["health"])


@health_router.get("/health", response_model=HealthResponse, summary="Platform health check")
async def health() -> HealthResponse:
    return HealthResponse(status="healthy", service=SERVICE_NAME, version=VERSION)
