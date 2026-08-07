"""Application settings — the shared configuration module.

Every backend process (API service, workers) resolves its configuration from
this single class. Values come from environment variables / `.env` files with
safe development defaults, so the service boots without external configuration
but fails closed in production when required secrets are absent.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.config.constants import SERVICE_NAME


class Settings(BaseSettings):
    """Typed, environment-driven configuration for all backend processes."""

    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_env: str = Field(default="development", description="development | staging | production")
    app_name: str = Field(default=SERVICE_NAME)
    debug: bool = Field(default=False)
    api_prefix: str = Field(default="/api/v1")

    # --- CORS ---
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        description="Allowed browser origins (JSON array, or comma-separated).",
    )

    # --- Database ---
    database_url: str = Field(default="postgresql+asyncpg://forgeai:forgeai@localhost:5432/forgeai")
    db_echo: bool = False
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # --- Redis ---
    redis_url: str | None = Field(
        default=None, description="Empty disables Redis-dependent features."
    )

    # --- Security (foundation config; consumed from Phase 3.2+) ---
    secret_key: str = Field(default="dev-only-change-me")
    jwt_public_key_pem: str | None = None
    jwt_private_key_pem: str | None = None
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    # --- LLM providers (foundation config; consumed from Phase 3.2+) ---
    llm_provider: str = "openai"
    llm_api_key: str | None = None
    llm_model: str = Field(default="gpt-4o-mini")
    llm_fallback_provider: str | None = None
    llm_fallback_api_key: str | None = None

    # --- Storage (foundation config; consumed from Phase 3.2+) ---
    storage_provider: str = "local"
    storage_bucket: str | None = None
    storage_region: str | None = None
    storage_access_key: str | None = None
    storage_secret_key: str | None = None
    storage_endpoint: str | None = None

    # --- ChromaDB (foundation config; consumed from Phase 3.2+) ---
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str | None = None

    # --- Observability ---
    log_level: str = Field(default="INFO", description="DEBUG | INFO | WARNING | ERROR")
    log_format: str = Field(default="text", description="text | json")
    log_file: str | None = Field(default=None, description="Optional rotating log file path.")

    # --- Password reset / email ---
    reset_token_ttl_minutes: int = Field(default=60)
    app_public_url: str = Field(default="http://localhost:3000")
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: Any) -> Any:
        """Accept a JSON array (pydantic-settings default) or a comma-separated list."""
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if not value.startswith("["):
                return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton (dependency-injected everywhere)."""
    return Settings()
