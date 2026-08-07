"""Canonical service constants shared across the platform."""

SERVICE_NAME = "ForgeAI Studio"
SERVICE_SLUG = "forgeai-studio"
VERSION = "1.0.0"

API_V1_PREFIX = "/api/v1"
OPENAPI_URL = f"{API_V1_PREFIX}/openapi.json"
DOCS_URL = f"{API_V1_PREFIX}/docs"
REDOC_URL = f"{API_V1_PREFIX}/redoc"

DEFAULT_CORS_ORIGINS = ("http://localhost:3000",)

REQUEST_ID_HEADER = "X-Request-Id"

REFRESH_COOKIE_NAME = "forgeai_refresh"

TOKEN_ISSUER = "forgeai-studio"
TOKEN_AUDIENCE = "forgeai-api"
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
