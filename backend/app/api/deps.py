"""Shared FastAPI dependencies (dependency injection container)."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Callable

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import Settings, get_settings
from app.core.context import get_request_id as _get_request_id
from app.core.errors import AppError, ErrorCode
from app.core.security import decode_access_token
from app.database.session import get_db_session as _get_db_session
from app.models.user import Role, User
from app.services import auth_service


def get_settings_dep(request: Request) -> Settings:
    """Resolve settings from the running app, falling back to the singleton.

    `create_app(settings=...)` attaches its settings to `app.state`, so tests
    and worker processes govern all downstream behavior (token signing,
    expiry, CORS) consistently; production uses the singleton from env.
    """
    return getattr(request.app.state, "settings", None) or get_settings()


async def get_request_id() -> str:
    """Expose the current request correlation id to endpoints."""
    return _get_request_id()


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield a database session, rolling back on failure (BAD §3.1)."""
    async for session in _get_db_session():
        yield session


SessionDep = Depends(get_db_session)
SettingsDep = Depends(get_settings_dep)


_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = SessionDep,
    settings: Settings = SettingsDep,
) -> User:
    """Resolve the authenticated user from the bearer token (BAD §13)."""
    if credentials is None or not credentials.credentials:
        raise AppError(code=ErrorCode.UNAUTHORIZED, message="Not authenticated", status_code=401)

    payload = decode_access_token(credentials.credentials, settings)
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise AppError(
            code=ErrorCode.UNAUTHORIZED,
            message="Invalid authentication token",
            status_code=401,
        ) from None
    user = await auth_service.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise AppError(code=ErrorCode.UNAUTHORIZED, message="Not authenticated", status_code=401)
    return user


CurrentUserDep = Depends(get_current_user)


def require_roles(*roles: Role) -> Callable:
    """Dependency factory enforcing role-based access (RBAC, BAD §13.2)."""
    allowed = {role.value for role in roles}

    async def _role_guard(current_user: User = CurrentUserDep) -> User:
        if current_user.role not in allowed:
            raise AppError(
                code=ErrorCode.FORBIDDEN,
                message="Insufficient permissions for this operation",
                status_code=403,
            )
        return current_user

    return _role_guard
