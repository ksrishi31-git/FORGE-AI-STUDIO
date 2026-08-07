"""Project request/response schemas (Phase 3.4)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.project import ProjectPriority, ProjectStatus, ProjectVisibility


class ProjectFields(BaseModel):
    """Shared editable fields for create and update payloads."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10000)
    business_domain: str | None = Field(default=None, max_length=200)
    requirements: str | None = Field(default=None, max_length=100000)
    target_users: str | None = Field(default=None, max_length=5000)
    preferred_stack: list[str] | None = Field(
        default=None, max_length=50, description="Technologies the pipeline should target."
    )

    @field_validator("preferred_stack")
    @classmethod
    def _clean_stack(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = [item.strip() for item in value if item.strip()]
        return cleaned or None


class ProjectCreateRequest(ProjectFields):
    name: str = Field(min_length=1, max_length=200)
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: ProjectPriority = ProjectPriority.MEDIUM
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE


class ProjectUpdateRequest(ProjectFields):
    """Patch payload. The service distinguishes "not sent" (unchanged) from
    an explicit empty value (cleared) via `model_fields_set`; an empty string
    or empty list therefore clears the stored field.
    """

    status: ProjectStatus | None = None
    priority: ProjectPriority | None = None
    visibility: ProjectVisibility | None = None

    @model_validator(mode="after")
    def _require_at_least_one_field(self) -> ProjectUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        return self


class ProjectSummaryResponse(BaseModel):
    """Lightweight project row used in lists and the dashboard."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    status: str
    priority: str
    visibility: str
    archived: bool
    progress: int = Field(
        default=0,
        description="Computed from completed pipeline tasks; 0 until the agent pipeline runs.",
    )
    owner: str
    created_at: datetime
    updated_at: datetime


class ProjectResponse(ProjectSummaryResponse):
    """Full project detail including requirement artifacts."""

    description: str | None
    business_domain: str | None
    requirements: str | None
    target_users: str | None
    preferred_stack: list[str] | None


class ProjectListResponse(BaseModel):
    """Paginated list envelope (BAD §5 — Page<T>)."""

    items: list[ProjectSummaryResponse]
    total: int
    page: int
    page_size: int


class ProjectSearchItem(BaseModel):
    """Compact result for the top-bar project search."""

    id: uuid.UUID
    name: str
    slug: str
    status: str
    updated_at: datetime
