"""Test suite for the backend.

The suite runs against a fresh file-backed SQLite database (aiosqlite) per
test, so every test is hermetic. A file (not `:memory:`) is used deliberately:
aiosqlite connections are created and destroyed across different event loops
during a run, and in-memory SQLite silently loses all tables when a connection
dies — a file survives connection churn and keeps the suite deterministic on
every platform.
"""

import asyncio
import logging
from pathlib import Path

import app.models  # noqa: F401 - registers all models on Base.metadata
import pytest
from app.config.settings import Settings
from app.database.base import Base
from app.database.session import configure_engine, get_engine
from app.main import create_app
from fastapi.testclient import TestClient

# aiosqlite logs every statement at DEBUG when the process logger is verbose;
# keep test output readable regardless of the developer's .env log level.
logging.getLogger("aiosqlite").setLevel(logging.WARNING)


def _test_settings(db_path: Path) -> Settings:
    return Settings(
        app_env="test",
        database_url=f"sqlite+aiosqlite:///{db_path}",
        redis_url=None,
        cors_origins=["http://localhost:3000"],
        # Quiet test runs: the developer's .env may enable DEBUG logging.
        log_level="WARNING",
        # Tests must never call a real LLM provider: explicit None overrides any
        # LLM_API_KEY in the developer's .env / environment so the suite stays
        # hermetic, fast, and offline (agents run on the deterministic engine).
        llm_api_key=None,
        # >= 32 bytes so PyJWT does not warn about the HMAC key length (RFC 7518).
        secret_key="test-secret-key-0123456789abcdef0123456789abcdef",
    )


@pytest.fixture()
def app_settings(tmp_path: Path) -> Settings:
    """Per-test settings bound to a unique file-backed SQLite database."""
    return _test_settings(tmp_path / "test.db")


@pytest.fixture(autouse=True)
def _database(app_settings: Settings) -> None:
    """Fresh schema for every test."""
    # A unique database URL per test forces the process-wide engine to rebuild.
    configure_engine(app_settings)
    engine = get_engine()

    async def _init() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(_init())


@pytest.fixture()
def client(app_settings: Settings) -> TestClient:
    application = create_app(settings=app_settings)
    return TestClient(application)
