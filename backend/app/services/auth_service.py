"""Authentication and user management service (BAD §5.1, §13.1)."""

from __future__ import annotations

import smtplib
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import Settings
from app.core.errors import AppError, ErrorCode
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    generate_reset_token,
    hash_password,
    hash_token,
    verify_password,
    verify_password_dummy,
)
from app.models.password_reset import PasswordResetToken
from app.models.session import AuthSession
from app.models.user import Role, User


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    """Normalize a stored timestamp to tz-aware UTC for comparisons.

    PostgreSQL timestamptz columns return aware datetimes; SQLite stores and
    returns naive datetimes (UTC by convention here). Normalizing keeps expiry
    checks correct on every backend.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


# --- Reads ---------------------------------------------------------------------


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession) -> Sequence[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


# --- Registration / login -------------------------------------------------------


async def register_user(
    db: AsyncSession, *, name: str, email: str, company_name: str | None, password: str
) -> User:
    normalized_email = email.lower()
    if await get_user_by_email(db, normalized_email) is not None:
        raise AppError(
            code=ErrorCode.CONFLICT,
            message="An account with this email already exists",
            status_code=409,
        )

    user = User(
        name=name.strip(),
        email=normalized_email,
        company_name=company_name,
        password_hash=hash_password(password),
        # Every registered user is a developer — full product access, no
        # read-only viewer tier.
        role=Role.DEVELOPER.value,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, *, email: str, password: str) -> User:
    user = await get_user_by_email(db, email)
    if user is None:
        verify_password_dummy(password)
        raise AppError(
            code=ErrorCode.UNAUTHORIZED,
            message="Invalid email or password",
            status_code=401,
        )
    if not verify_password(password, user.password_hash):
        raise AppError(
            code=ErrorCode.UNAUTHORIZED,
            message="Invalid email or password",
            status_code=401,
        )
    if not user.is_active:
        raise AppError(
            code=ErrorCode.FORBIDDEN,
            message="This account has been deactivated",
            status_code=403,
        )
    return user


# --- Token lifecycle -------------------------------------------------------------


async def create_token_pair(
    db: AsyncSession,
    user: User,
    *,
    settings: Settings,
    user_agent: str | None,
    ip: str | None,
) -> tuple[str, str]:
    """Issue an access token and a persisted, hashed refresh token."""
    access_token = create_access_token(user_id=user.id, role=user.role, settings=settings)
    refresh_token = generate_refresh_token()
    session = AuthSession(
        user_id=user.id,
        family_id=uuid.uuid4(),
        refresh_token_hash=hash_token(refresh_token),
        user_agent=(user_agent or "")[:255] or None,
        ip=ip,
        expires_at=_now() + timedelta(days=settings.refresh_token_ttl_days),
    )
    db.add(session)
    await db.commit()
    return access_token, refresh_token


async def rotate_refresh_token(
    db: AsyncSession,
    presented_token: str,
    *,
    settings: Settings,
    user_agent: str | None,
    ip: str | None,
) -> tuple[User, str, str]:
    """Rotate a refresh token; revoke the family on reuse detection."""
    digest = hash_token(presented_token)
    session = await db.scalar(select(AuthSession).where(AuthSession.refresh_token_hash == digest))
    if session is None:
        raise AppError(
            code=ErrorCode.UNAUTHORIZED, message="Invalid refresh token", status_code=401
        )

    if session.revoked_at is not None:
        await _revoke_family(db, session.family_id)
        raise AppError(
            code=ErrorCode.UNAUTHORIZED, message="Invalid refresh token", status_code=401
        )

    if _as_utc(session.expires_at) <= _now():
        session.revoked_at = _now()
        await db.commit()
        raise AppError(
            code=ErrorCode.TOKEN_EXPIRED, message="Refresh token expired", status_code=401
        )

    user = await get_user_by_id(db, session.user_id)
    if user is None or not user.is_active:
        raise AppError(
            code=ErrorCode.UNAUTHORIZED, message="Invalid refresh token", status_code=401
        )

    session.revoked_at = _now()
    db.add(session)

    new_refresh = generate_refresh_token()
    successor = AuthSession(
        user_id=user.id,
        family_id=session.family_id,
        refresh_token_hash=hash_token(new_refresh),
        user_agent=(user_agent or "")[:255] or None,
        ip=ip,
        expires_at=_now() + timedelta(days=settings.refresh_token_ttl_days),
    )
    db.add(successor)
    await db.commit()

    access_token = create_access_token(user_id=user.id, role=user.role, settings=settings)
    return user, access_token, new_refresh


async def revoke_refresh_token(db: AsyncSession, presented_token: str) -> None:
    digest = hash_token(presented_token)
    session = await db.scalar(select(AuthSession).where(AuthSession.refresh_token_hash == digest))
    if session is not None and session.revoked_at is None:
        session.revoked_at = _now()
        await db.commit()


async def _revoke_family(db: AsyncSession, family_id: uuid.UUID) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.family_id == family_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    await db.commit()


# --- Profile / password -----------------------------------------------------------


async def update_profile(
    db: AsyncSession,
    user: User,
    *,
    name: str | None,
    company_name: str | None,
    avatar: str | None,
) -> User:
    if name is not None:
        user.name = name.strip()
    if company_name is not None:
        user.company_name = company_name
    if avatar is not None:
        user.avatar = avatar
    await db.commit()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession, user: User, *, current_password: str, new_password: str
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AppError(
            code=ErrorCode.UNAUTHORIZED,
            message="Current password is incorrect",
            status_code=401,
        )
    user.password_hash = hash_password(new_password)
    await db.commit()
    await _revoke_all_sessions(db, user.id)


async def _revoke_all_sessions(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    await db.commit()


# --- Password reset ----------------------------------------------------------------


async def create_password_reset(db: AsyncSession, *, email: str, settings: Settings) -> str | None:
    """Issue a single-use reset token; returns None for unknown emails (no enumeration)."""
    user = await get_user_by_email(db, email)
    if user is None:
        return None
    token = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=_now() + timedelta(minutes=settings.reset_token_ttl_minutes),
        )
    )
    await db.commit()
    return token


async def reset_password(db: AsyncSession, *, token: str, new_password: str) -> None:
    digest = hash_token(token)
    record = await db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == digest)
    )
    if record is None or record.used_at is not None or _as_utc(record.expires_at) <= _now():
        raise AppError(
            code=ErrorCode.INVALID_RESET_TOKEN,
            message="This reset link is invalid or has expired",
            status_code=400,
        )
    user = await get_user_by_id(db, record.user_id)
    if user is None:
        raise AppError(
            code=ErrorCode.INVALID_RESET_TOKEN,
            message="This reset link is invalid or has expired",
            status_code=400,
        )
    record.used_at = _now()
    user.password_hash = hash_password(new_password)
    await db.commit()
    await _revoke_all_sessions(db, user.id)


# --- Email delivery -----------------------------------------------------------------


def send_reset_email(*, email: str, reset_url: str, settings: Settings) -> None:
    """Send the reset link via SMTP when configured; no-op otherwise (dev returns URL)."""
    if not settings.smtp_host:
        return
    message = EmailMessage()
    message["Subject"] = "Reset your ForgeAI Studio password"
    message["From"] = settings.smtp_from or "no-reply@forgeai.local"
    message["To"] = email
    message.set_content(
        f"Reset your password using this link (expires in "
        f"{settings.reset_token_ttl_minutes} minutes):\n\n{reset_url}"
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_user and settings.smtp_password:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def build_reset_url(*, token: str, settings: Settings) -> str:
    base = settings.app_public_url.rstrip("/")
    return f"{base}/auth/reset-password?token={token}"
