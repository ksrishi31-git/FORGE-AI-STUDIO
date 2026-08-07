"""Authentication and user management endpoints (Phase 3.2)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, SettingsDep, get_current_user, require_roles
from app.config.constants import REFRESH_COOKIE_NAME
from app.config.settings import Settings
from app.core.errors import AppError, ErrorCode
from app.core.logging import get_logger
from app.models.user import Role, User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

logger = get_logger(__name__)

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="strict",
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")


def _read_refresh_token(request: Request, body: RefreshRequest) -> str:
    cookie = request.cookies.get(REFRESH_COOKIE_NAME)
    return body.refresh_token or cookie or ""


def _token_response(
    *, user: User, access_token: str, refresh_token: str, settings: Settings
) -> TokenResponse:
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_ttl_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@auth_router.post(
    "/register", response_model=TokenResponse, status_code=201, summary="Register a new account"
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = SessionDep,
    settings: Settings = SettingsDep,
) -> TokenResponse:
    user = await auth_service.register_user(
        db,
        name=payload.name,
        email=str(payload.email),
        company_name=payload.company_name,
        password=payload.password,
    )
    access_token, refresh_token = await auth_service.create_token_pair(
        db,
        user,
        settings=settings,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    _set_refresh_cookie(response, refresh_token, settings)
    logger.info("User registered {user_id} role={role}", user_id=user.id, role=user.role)
    return _token_response(
        user=user, access_token=access_token, refresh_token=refresh_token, settings=settings
    )


@auth_router.post("/login", response_model=TokenResponse, summary="Sign in")
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = SessionDep,
    settings: Settings = SettingsDep,
) -> TokenResponse:
    user = await auth_service.authenticate_user(
        db, email=str(payload.email), password=payload.password
    )
    access_token, refresh_token = await auth_service.create_token_pair(
        db,
        user,
        settings=settings,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    _set_refresh_cookie(response, refresh_token, settings)
    logger.info("User logged in {user_id}", user_id=user.id)
    return _token_response(
        user=user, access_token=access_token, refresh_token=refresh_token, settings=settings
    )


@auth_router.post("/logout", status_code=204, summary="Sign out and revoke the refresh token")
async def logout(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: AsyncSession = SessionDep,
) -> Response:
    presented = _read_refresh_token(request, payload)
    if presented:
        await auth_service.revoke_refresh_token(db, presented)
    _clear_refresh_cookie(response)
    return Response(status_code=204)


@auth_router.post("/refresh", response_model=TokenResponse, summary="Rotate the refresh token")
async def refresh(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: AsyncSession = SessionDep,
    settings: Settings = SettingsDep,
) -> TokenResponse:
    presented = _read_refresh_token(request, payload)
    if not presented:
        raise AppError(
            code=ErrorCode.UNAUTHORIZED, message="Missing refresh token", status_code=401
        )
    user, access_token, new_refresh = await auth_service.rotate_refresh_token(
        db,
        presented,
        settings=settings,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    _set_refresh_cookie(response, new_refresh, settings)
    return _token_response(
        user=user, access_token=access_token, refresh_token=new_refresh, settings=settings
    )


@auth_router.get("/me", response_model=UserResponse, summary="Current user profile")
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@auth_router.patch("/profile", response_model=UserResponse, summary="Update own profile")
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> UserResponse:
    user = await auth_service.update_profile(
        db,
        current_user,
        name=payload.name,
        company_name=payload.company_name,
        avatar=payload.avatar,
    )
    return UserResponse.model_validate(user)


@auth_router.patch("/change-password", status_code=204, summary="Change the current user password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> Response:
    await auth_service.change_password(
        db,
        current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return Response(status_code=204)


@auth_router.post(
    "/forgot-password", response_model=ForgotPasswordResponse, summary="Request a password reset"
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = SessionDep,
    settings: Settings = SettingsDep,
) -> ForgotPasswordResponse:
    token = await auth_service.create_password_reset(
        db, email=str(payload.email), settings=settings
    )
    reset_url: str | None = None
    if token is not None:
        reset_url = auth_service.build_reset_url(token=token, settings=settings)
        # SMTP I/O is blocking — keep it off the event loop (BAD §8).
        await asyncio.to_thread(
            auth_service.send_reset_email,
            email=str(payload.email),
            reset_url=reset_url,
            settings=settings,
        )
    # Unconditional message: prevents account enumeration. The reset link is a
    # dev/staging convenience only — never disclosed in production.
    return ForgotPasswordResponse(
        message="If an account exists for this email, a reset link has been sent.",
        reset_url=(reset_url if token is not None and settings.app_env != "production" else None),
    )


@auth_router.post("/reset-password", status_code=204, summary="Complete a password reset")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = SessionDep,
) -> Response:
    await auth_service.reset_password(db, token=payload.token, new_password=payload.new_password)
    return Response(status_code=204)


@auth_router.get(
    "/users",
    response_model=list[UserResponse],
    summary="List users (admin only)",
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def list_users(db: AsyncSession = SessionDep) -> list[UserResponse]:
    users = await auth_service.list_users(db)
    return [UserResponse.model_validate(user) for user in users]
