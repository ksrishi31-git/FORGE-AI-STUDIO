"""Project workspace service (Phase 3.4).

Ownership model: every user sees and manages their own projects; admins see
and manage every project. Non-owner access to a specific project is reported
as NOT_FOUND so project existence is not leaked to other tenants.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ErrorCode
from app.models.project import Project
from app.models.user import Role, User

_SLUG_MAX_LENGTH = 60


def _now() -> datetime:
    return datetime.now(UTC)


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:_SLUG_MAX_LENGTH] or "project"


# --- Scope / queries -------------------------------------------------------------


def _visible_projects(user: User) -> object:
    """Base query restricted to non-deleted rows the user may see."""
    scope = Project.deleted_at.is_(None)
    if user.role != Role.ADMIN.value:
        scope = scope & (Project.owner_id == user.id)
    return scope


async def _unique_slug(db: AsyncSession, name: str, *, exclude_id: uuid.UUID | None = None) -> str:
    base = _slugify(name)
    candidate = base
    counter = 2
    while True:
        stmt = select(Project.id).where(Project.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Project.id != exclude_id)
        exists = await db.scalar(stmt)
        if exists is None:
            return candidate
        candidate = f"{base}-{counter}"
        counter += 1


# --- Reads -----------------------------------------------------------------------


async def list_projects(
    db: AsyncSession,
    user: User,
    *,
    q: str | None,
    status: str | None,
    priority: str | None,
    visibility: str | None,
    archived: bool | None,
    page: int,
    page_size: int,
) -> tuple[Sequence[Project], int]:
    """Paginate visible projects with optional search and filters."""
    conditions = [_visible_projects(user)]
    if status is not None:
        conditions.append(Project.status == status)
    if priority is not None:
        conditions.append(Project.priority == priority)
    if visibility is not None:
        conditions.append(Project.visibility == visibility)
    # Archived projects are hidden by default (and by archived=false);
    # archived=true surfaces them. Mirrors enterprise archive semantics.
    if archived is True:
        conditions.append(Project.archived_at.is_not(None))
    else:
        conditions.append(Project.archived_at.is_(None))
    if q:
        pattern = f"%{q.strip().lower()}%"
        conditions.append(
            or_(
                func.lower(Project.name).like(pattern),
                func.lower(Project.business_domain).like(pattern),
                func.lower(Project.description).like(pattern),
            )
        )

    total = await db.scalar(select(func.count()).select_from(Project).where(*conditions))
    result = await db.execute(
        select(Project)
        .where(*conditions)
        .order_by(Project.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all(), int(total or 0)


async def search_projects(db: AsyncSession, user: User, *, q: str, limit: int) -> Sequence[Project]:
    """Compact name/business-domain search across the user's visible projects."""
    pattern = f"%{q.strip().lower()}%"
    result = await db.execute(
        select(Project)
        .where(
            _visible_projects(user),
            or_(
                func.lower(Project.name).like(pattern),
                func.lower(Project.business_domain).like(pattern),
            ),
        )
        .order_by(Project.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_project_for_user(db: AsyncSession, user: User, project_id: uuid.UUID) -> Project:
    """Fetch a visible project or raise NOT_FOUND (no existence leak)."""
    project = await db.scalar(
        select(Project).where(Project.id == project_id, _visible_projects(user))
    )
    if project is None:
        raise AppError(code=ErrorCode.NOT_FOUND, message="Project not found", status_code=404)
    return project


# --- Mutations -------------------------------------------------------------------


async def create_project(
    db: AsyncSession,
    user: User,
    *,
    name: str,
    description: str | None,
    business_domain: str | None,
    requirements: str | None,
    target_users: str | None,
    preferred_stack: list[str] | None,
    status: str,
    priority: str,
    visibility: str,
) -> Project:
    project = Project(
        name=name.strip(),
        slug=await _unique_slug(db, name),
        description=description,
        business_domain=business_domain,
        requirements=requirements,
        target_users=target_users,
        preferred_stack=preferred_stack,
        status=status,
        priority=priority,
        visibility=visibility,
        owner_id=user.id,
    )
    project.owner = user
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(
    db: AsyncSession, project: Project, *, fields: dict[str, object]
) -> Project:
    """Apply an explicit set of updates.

    Only keys present in `fields` are written (driven by the PATCH payload's
    `model_fields_set`). Text fields normalize empty strings to NULL so clients
    can clear a previously set value; the same applies to an empty stack list.
    """
    for key, value in fields.items():
        if key == "name":
            assert isinstance(value, str)
            project.name = value.strip()
            project.slug = await _unique_slug(db, value, exclude_id=project.id)
        elif key in ("description", "business_domain", "requirements", "target_users"):
            setattr(project, key, value.strip() or None if isinstance(value, str) else None)
        elif key == "preferred_stack":
            project.preferred_stack = value if isinstance(value, list) else None
        elif key in ("status", "priority", "visibility"):
            assert isinstance(value, str)
            setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project


async def soft_delete_project(db: AsyncSession, project: Project) -> None:
    project.deleted_at = _now()
    await db.commit()


async def archive_project(db: AsyncSession, project: Project) -> Project:
    project.archived_at = _now()
    await db.commit()
    await db.refresh(project)
    return project


async def restore_project(db: AsyncSession, project: Project) -> Project:
    project.archived_at = None
    await db.commit()
    await db.refresh(project)
    return project
