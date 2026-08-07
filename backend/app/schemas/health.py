"""Health check schemas (Phase 3.1)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Payload for GET /api/v1/health."""

    status: Literal["healthy"]
    service: str
    version: str


class LiveResponse(BaseModel):
    """Payload for the liveness probe."""

    status: Literal["ok"]


class ComponentStatus(BaseModel):
    """Readiness result for a single dependency."""

    name: str
    status: Literal["ok", "unavailable", "skipped"]
    detail: str | None = None


class ReadyResponse(BaseModel):
    """Payload for the readiness probe."""

    status: Literal["ready", "not_ready"]
    components: list[ComponentStatus]
