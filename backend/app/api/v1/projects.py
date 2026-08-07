"""Project workspace endpoints (Phase 3.4)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, get_current_user, require_roles
from app.core.logging import get_logger
from app.models.project import Project, ProjectPriority, ProjectStatus, ProjectVisibility
from app.models.user import Role, User
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectSearchItem,
    ProjectSummaryResponse,
    ProjectUpdateRequest,
)
from app.services import project_service

logger = get_logger(__name__)

projects_router = APIRouter(prefix="/projects", tags=["projects"])

ProjectId = Annotated[uuid.UUID, Path(description="Project id")]


def _summarize(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "slug": project.slug,
        "status": project.status,
        "priority": project.priority,
        "visibility": project.visibility,
        "archived": project.archived_at is not None,
        "progress": 0,
        "owner": project.owner.name if project.owner else "",
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


def _detail(project: Project) -> dict:
    return {
        **_summarize(project),
        "description": project.description,
        "business_domain": project.business_domain,
        "requirements": project.requirements,
        "target_users": project.target_users,
        "preferred_stack": project.preferred_stack,
    }


def _search_item(project: Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "slug": project.slug,
        "status": project.status,
        "updated_at": project.updated_at,
    }


@projects_router.get("", response_model=ProjectListResponse, summary="List projects")
async def list_projects(
    q: Annotated[str | None, Query(max_length=200)] = None,
    status: Annotated[ProjectStatus | None, Query()] = None,
    priority: Annotated[ProjectPriority | None, Query()] = None,
    visibility: Annotated[ProjectVisibility | None, Query()] = None,
    archived: Annotated[bool | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> ProjectListResponse:
    items, total = await project_service.list_projects(
        db,
        current_user,
        q=q,
        status=status.value if status is not None else None,
        priority=priority.value if priority is not None else None,
        visibility=visibility.value if visibility is not None else None,
        archived=archived,
        page=page,
        page_size=page_size,
    )
    return ProjectListResponse(
        items=[ProjectSummaryResponse(**_summarize(project)) for project in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@projects_router.get("/search", response_model=list[ProjectSearchItem], summary="Search projects")
async def search_projects(
    q: Annotated[str, Query(min_length=1, max_length=200)],
    page_size: Annotated[int, Query(ge=1, le=50)] = 8,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> list[ProjectSearchItem]:
    items = await project_service.search_projects(db, current_user, q=q, limit=page_size)
    return [ProjectSearchItem(**_search_item(project)) for project in items]


@projects_router.post(
    "",
    response_model=ProjectResponse,
    status_code=201,
    summary="Create a project",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def create_project(
    payload: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> ProjectResponse:
    project = await project_service.create_project(
        db,
        current_user,
        name=payload.name,
        description=payload.description,
        business_domain=payload.business_domain,
        requirements=payload.requirements,
        target_users=payload.target_users,
        preferred_stack=payload.preferred_stack,
        status=payload.status.value,
        priority=payload.priority.value,
        visibility=payload.visibility.value,
    )
    logger.info(
        "Project created {project_id} owner={owner_id}",
        project_id=project.id,
        owner_id=current_user.id,
    )
    return ProjectResponse(**_detail(project))


@projects_router.get("/{project_id}", response_model=ProjectResponse, summary="Project detail")
async def get_project(
    project_id: ProjectId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> ProjectResponse:
    project = await project_service.get_project_for_user(db, current_user, project_id)
    return ProjectResponse(**_detail(project))


@projects_router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update a project",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def update_project(
    project_id: ProjectId,
    payload: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> ProjectResponse:
    project = await project_service.get_project_for_user(db, current_user, project_id)
    fields: dict[str, object] = {
        field: getattr(payload, field) for field in payload.model_fields_set
    }
    if "status" in fields:
        fields["status"] = ProjectStatus(fields["status"]).value
    if "priority" in fields:
        fields["priority"] = ProjectPriority(fields["priority"]).value
    if "visibility" in fields:
        fields["visibility"] = ProjectVisibility(fields["visibility"]).value
    project = await project_service.update_project(db, project, fields=fields)
    return ProjectResponse(**_detail(project))


@projects_router.delete(
    "/{project_id}",
    status_code=204,
    summary="Soft delete a project",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def delete_project(
    project_id: ProjectId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> Response:
    project = await project_service.get_project_for_user(db, current_user, project_id)
    await project_service.soft_delete_project(db, project)
    logger.info("Project soft-deleted {project_id}", project_id=project.id)
    return Response(status_code=204)


@projects_router.post(
    "/{project_id}/archive",
    response_model=ProjectResponse,
    summary="Archive a project",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def archive_project(
    project_id: ProjectId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> ProjectResponse:
    project = await project_service.get_project_for_user(db, current_user, project_id)
    project = await project_service.archive_project(db, project)
    return ProjectResponse(**_detail(project))


@projects_router.post(
    "/{project_id}/restore",
    response_model=ProjectResponse,
    summary="Restore an archived project",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def restore_project(
    project_id: ProjectId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> ProjectResponse:
    project = await project_service.get_project_for_user(db, current_user, project_id)
    project = await project_service.restore_project(db, project)
    return ProjectResponse(**_detail(project))
