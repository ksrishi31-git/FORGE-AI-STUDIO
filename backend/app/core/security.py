"""Security primitives: password hashing (passlib/bcrypt) and JWT (PyJWT).

Token policy (BAD §13.1): access tokens are short-lived JWT (HS256 in
development; RS256 when a PEM private key is configured); refresh tokens are
opaque, stored hashed, and rotated on use.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from app.config.constants import (
    ACCESS_TOKEN_TYPE,
    TOKEN_AUDIENCE,
    TOKEN_ISSUER,
)
from app.config.settings import Settings
from app.core.errors import AppError, ErrorCode

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_dummy_hash: str | None = None


# --- Passwords -----------------------------------------------------------------


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def verify_password_dummy(plain: str) -> bool:
    """Verify against a decoy hash to equalize login timing for unknown emails."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = _pwd_context.hash("forgeai-decoy-password")
    return _pwd_context.verify(plain, _dummy_hash)


# --- Tokens --------------------------------------------------------------------


def _jwt_key(settings: Settings) -> str:
    return settings.jwt_private_key_pem or settings.secret_key


def _jwt_algorithm(settings: Settings) -> str:
    return "RS256" if settings.jwt_private_key_pem else "HS256"


def create_access_token(*, user_id: uuid.UUID, role: str, settings: Settings) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": ACCESS_TOKEN_TYPE,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
    }
    return jwt.encode(payload, _jwt_key(settings), algorithm=_jwt_algorithm(settings))


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    """Decode and validate an access token; raises a 401 AppError on failure."""
    try:
        payload = jwt.decode(
            token,
            _jwt_key(settings),
            algorithms=[_jwt_algorithm(settings)],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
            options={"require": ["sub", "role", "type", "jti", "exp", "iat"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppError(
            code=ErrorCode.TOKEN_EXPIRED,
            message="Token has expired",
            status_code=401,
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise AppError(
            code=ErrorCode.UNAUTHORIZED,
            message="Invalid authentication token",
            status_code=401,
        ) from exc

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise AppError(
            code=ErrorCode.UNAUTHORIZED, message="Invalid authentication token", status_code=401
        )
    return payload


def generate_refresh_token() -> str:
    """Opaque, high-entropy refresh token (never stored in plaintext)."""
    return secrets.token_urlsafe(48)


def generate_reset_token() -> str:
    """Opaque single-use password reset token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 digest used for at-rest token storage and lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
