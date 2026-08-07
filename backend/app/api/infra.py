"""Infrastructure-facing health endpoints (DAD §7.1).

`/healthz` is a pure liveness probe. `/readyz` verifies configured dependencies
(PostgreSQL, Redis) and reports per-component status; it returns 503 when a
configured dependency is unreachable so orchestrators can route traffic away.
"""

from __future__ import annotations

import asyncio

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.deps import get_settings_dep
from app.config.settings import Settings
from app.schemas.health import ComponentStatus, LiveResponse, ReadyResponse

infra_router = APIRouter(tags=["infrastructure"])

_DEPENDENCY_TIMEOUT_SECONDS = 2.0


async def _check_database(settings: Settings) -> ComponentStatus:
    if not settings.database_url:
        return ComponentStatus(name="database", status="skipped", detail="not configured")
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(settings.database_url)
    try:
        async with engine.connect() as connection:
            await asyncio.wait_for(
                connection.execute(text("SELECT 1")), timeout=_DEPENDENCY_TIMEOUT_SECONDS
            )
        return ComponentStatus(name="database", status="ok")
    except Exception as exc:  # pragma: no cover - depends on live infrastructure
        return ComponentStatus(name="database", status="unavailable", detail=str(exc)[:200])
    finally:
        await engine.dispose()


async def _check_redis(settings: Settings) -> ComponentStatus:
    if not settings.redis_url:
        return ComponentStatus(name="redis", status="skipped", detail="not configured")
    client = aioredis.from_url(
        settings.redis_url, socket_connect_timeout=_DEPENDENCY_TIMEOUT_SECONDS
    )
    try:
        await asyncio.wait_for(client.ping(), timeout=_DEPENDENCY_TIMEOUT_SECONDS)
        return ComponentStatus(name="redis", status="ok")
    except Exception as exc:  # pragma: no cover - depends on live infrastructure
        return ComponentStatus(name="redis", status="unavailable", detail=str(exc)[:200])
    finally:
        await client.aclose()


@infra_router.get("/healthz", response_model=LiveResponse, summary="Liveness probe")
async def healthz() -> LiveResponse:
    return LiveResponse(status="ok")


@infra_router.get("/readyz", response_model=ReadyResponse, summary="Readiness probe")
async def readyz(settings: Settings = Depends(get_settings_dep)) -> JSONResponse:
    components = await asyncio.gather(_check_database(settings), _check_redis(settings))
    failed = [component for component in components if component.status == "unavailable"]
    ready = not failed
    payload = ReadyResponse(status="ready" if ready else "not_ready", components=list(components))
    return JSONResponse(status_code=200 if ready else 503, content=payload.model_dump())
