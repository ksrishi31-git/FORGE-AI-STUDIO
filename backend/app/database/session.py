"""Async SQLAlchemy engine and session management (BAD §3.1, §6).

The engine is created lazily so the API service boots without a running
postgres and `/api/v1/health` remains green; readiness is the job of
`/readyz`. Connections are pooled per settings. SQLite (tests) uses a
shared in-memory pool.
"""

from __future__ import annotations

import threading
from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool, StaticPool

from app.config.settings import Settings, get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None
_engine_settings: Settings | None = None
_lock = threading.Lock()


def _build_engine(settings: Settings) -> AsyncEngine:
    kwargs: dict = {"echo": settings.db_echo, "pool_pre_ping": True}
    if settings.database_url.startswith("sqlite"):
        # In-memory SQLite needs a single shared connection so every session
        # sees the same database. File-backed SQLite gets one connection per
        # checkout: concurrent sessions (parallel graph branches, the test
        # client portal thread) never share a connection, and the busy timeout
        # serializes writers instead of failing with "database is locked".
        kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
        if ":memory:" in settings.database_url:
            kwargs["poolclass"] = StaticPool
        else:
            kwargs["poolclass"] = NullPool
    else:
        kwargs["pool_size"] = settings.db_pool_size
        kwargs["max_overflow"] = settings.db_max_overflow
    engine = create_async_engine(settings.database_url, **kwargs)
    if settings.database_url.startswith("sqlite") and ":memory:" not in settings.database_url:
        # File-backed SQLite is shared by the API (portal thread) and worker
        # tasks (their own loops). WAL lets readers coexist with a writer, and
        # the busy timeout makes transient write contention wait instead of
        # raising "database is locked".
        @event.listens_for(engine.sync_engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:  # noqa: ANN001
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.close()

    return engine


def configure_engine(settings: Settings) -> AsyncEngine:
    """Set the process-wide engine from explicit settings (tests/workers)."""
    global _engine, _session_factory, _engine_settings
    with _lock:
        needs_rebuild = (
            _engine is None
            or _engine_settings is None
            or _engine_settings.database_url != settings.database_url
        )
        if needs_rebuild:
            _engine = _build_engine(settings)
            _session_factory = async_sessionmaker(
                _engine, class_=AsyncSession, expire_on_commit=False
            )
            _engine_settings = settings
    assert _engine is not None
    return _engine


def get_engine() -> AsyncEngine:
    """Return the process-wide engine, creating it on first use (thread-safe)."""
    if _engine is None:
        return configure_engine(get_settings())
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    get_engine()
    assert _session_factory is not None
    return _session_factory


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield a session; rollback and close on failure, close on success."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Dispose the engine on application shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None
