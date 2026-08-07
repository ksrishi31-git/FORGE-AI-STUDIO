"""Authentication and user management request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company_name: str | None = Field(default=None, max_length=200)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("company_name")
    @classmethod
    def _empty_company_is_none(cls, value: str | None) -> str | None:
        return value.strip() or None if isinstance(value, str) else None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str | None = Field(
        default=None, description="Optional; falls back to the cookie."
    )


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    company_name: str | None = Field(default=None, max_length=200)
    avatar: str | None = Field(default=None, max_length=500)

    @field_validator("avatar")
    @classmethod
    def _empty_avatar_is_none(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("company_name")
    @classmethod
    def _empty_company_is_none(cls, value: str | None) -> str | None:
        return value.strip() or None if isinstance(value, str) else None

    @model_validator(mode="after")
    def _require_at_least_one_field(self) -> ProfileUpdateRequest:
        if self.name is None and self.company_name is None and self.avatar is None:
            raise ValueError("Provide at least one field to update")
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    company_name: str | None
    role: str
    avatar: str | None
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_url: str | None = Field(
        default=None, description="Development-only when email is not configured."
    )
