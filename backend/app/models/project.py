"""Project model (Phase 3.4 spec fields)."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.database.base import Base, TimestampMixin
from app.models.user import User


class ProjectStatus(StrEnum):
    """Lifecycle state of a project, driven by the agent pipeline."""

    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class ProjectPriority(StrEnum):
    """Business priority assigned by the owner."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProjectVisibility(StrEnum):
    """Who may discover the project within the platform."""

    PRIVATE = "private"
    TEAM = "team"
    PUBLIC = "public"


class Project(Base, TimestampMixin):
    """A software engineering project driven by the autonomous agent pipeline.

    Soft deletion (`deleted_at`) hides the row from every user-facing query
    without destroying data; archiving (`archived_at`) is an explicit owner
    action distinct from lifecycle status.
    """

    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('planning', 'in_progress', 'completed', 'failed')",
            name="ck_projects_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'critical')",
            name="ck_projects_priority",
        ),
        CheckConstraint(
            "visibility IN ('private', 'team', 'public')",
            name="ck_projects_visibility",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(240), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_domain: Mapped[str | None] = mapped_column(String(200), nullable=True)
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_users: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_stack: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ProjectStatus.PLANNING.value, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ProjectPriority.MEDIUM.value
    )
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ProjectVisibility.PRIVATE.value
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    owner: Mapped[User] = relationship("User", foreign_keys=[owner_id], lazy="selectin")
