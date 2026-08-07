"""User and role models (Phase 3.2 spec fields)."""

from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.database.base import Base, TimestampMixin


class Role(StrEnum):
    """Platform roles (RBAC): developer and admin.

    Every registered user is a developer with full product access; admin is a
    privileged role reserved for platform administration.
    """

    ADMIN = "admin"
    DEVELOPER = "developer"


class User(Base, TimestampMixin):
    """Platform user account."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('admin', 'developer')", name="ck_users_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True, unique=True)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=Role.DEVELOPER.value)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
