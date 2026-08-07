"""Versioned API router (v1) — aggregates v1 endpoint modules."""

from fastapi import APIRouter

from app.api.v1.agents import agents_router
from app.api.v1.auth import auth_router
from app.api.v1.health import health_router
from app.api.v1.notifications import notifications_router
from app.api.v1.projects import projects_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(agents_router)
api_v1_router.include_router(notifications_router)
