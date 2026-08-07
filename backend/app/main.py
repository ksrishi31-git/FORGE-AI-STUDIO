"""FastAPI application factory.

Central assembly point: middleware, exception handlers, routers, and lifespan.
Exposes both a factory (`create_app`) for tests and a module-level instance
(`app`) for uvicorn.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.infra import infra_router
from app.api.router import api_router
from app.config.constants import DOCS_URL, OPENAPI_URL, REDOC_URL, SERVICE_NAME, VERSION
from app.config.settings import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.database.session import dispose_engine
from app.services import agent_service

logger = get_logger(__name__)

# Periodically fails runs stranded by a crash or restart so the UI never locks
# onto a permanently "queued"/"running" execution (the startup pass handles
# the immediate case; long-lived servers rely on this loop).
_RECONCILE_INTERVAL_SECONDS = 60


async def _reconcile_loop() -> None:
    """Background loop: fail orphaned agent runs beyond their grace period."""
    while True:
        await asyncio.sleep(_RECONCILE_INTERVAL_SECONDS)
        try:
            stale = await agent_service.reconcile_stale_runs()
            if stale:
                logger.warning("Reconciled {count} stale agent run(s)", count=stale)
        except Exception as exc:  # noqa: BLE001 - the loop must keep running
            logger.warning("Stale-run reconciliation failed: {error}", error=exc)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build a configured FastAPI application instance."""
    settings = settings or get_settings()

    configure_logging(
        level=settings.log_level.upper(), fmt=settings.log_format, log_file=settings.log_file
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info(
            "{service} v{version} starting (env={env})",
            service=SERVICE_NAME,
            version=VERSION,
            env=settings.app_env,
        )
        # A previous process may have crashed mid-pipeline; fail those runs so
        # the UI never shows a permanently "running" execution.
        try:
            stale = await agent_service.reconcile_stale_runs()
            if stale:
                logger.warning("Reconciled {count} stale agent run(s)", count=stale)
        except Exception as exc:  # noqa: BLE001 - startup must not fail on cleanup
            logger.warning("Stale-run reconciliation failed: {error}", error=exc)
        # Keep failing orphaned runs while the server stays up.
        reconcile_task = asyncio.create_task(_reconcile_loop())
        yield
        reconcile_task.cancel()
        try:
            await reconcile_task
        except asyncio.CancelledError:
            pass
        await dispose_engine()
        logger.info("{service} stopped", service=SERVICE_NAME)

    application = FastAPI(
        title=f"{SERVICE_NAME} API",
        description="Enterprise multi-agent software engineering platform — API.",
        version=VERSION,
        docs_url=DOCS_URL,
        redoc_url=REDOC_URL,
        openapi_url=OPENAPI_URL,
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(RequestContextMiddleware)

    # The running app's settings are authoritative for dependencies (token
    # signing, expiry, CORS); the module singleton is the production default.
    application.state.settings = settings

    register_exception_handlers(application)
    application.include_router(api_router, prefix=settings.api_prefix)
    application.include_router(infra_router)

    return application


app = create_app()
