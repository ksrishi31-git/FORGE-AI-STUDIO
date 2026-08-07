"""Multi-agent engine endpoints (Phase 3.5)."""

from __future__ import annotations

import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, SettingsDep, get_current_user, require_roles
from app.config.settings import Settings
from app.core.logging import get_logger
from app.models.user import Role, User
from app.schemas.agent import (
    AgentDefinitionResponse,
    AgentRunRequest,
    AgentStepResponse,
    RunAcceptedResponse,
    RunHistoryItem,
    RunHistoryResponse,
    RunOutputResponse,
    RunStatusResponse,
    agent_definitions,
)
from app.services import agent_service

logger = get_logger(__name__)

agents_router = APIRouter(prefix="/agents", tags=["agents"])

RunId = Annotated[uuid.UUID, Path(description="Agent run id")]


def _status(run) -> RunStatusResponse:
    return RunStatusResponse(
        id=run.id,
        project_id=run.project_id,
        status=run.status,
        mode=run.mode,
        current_step=run.current_step,
        total_steps=run.total_steps,
        completed_steps=run.completed_steps,
        progress=agent_service.progress(run),
        error=run.error,
        started_at=run.started_at,
        finished_at=run.finished_at,
        created_at=run.created_at,
        iteration=run.iteration or 1,
        verdict=run.verdict,
        overall_score=run.overall_score,
    )


def _step(step) -> AgentStepResponse:
    output: dict | None = None
    if step.output:
        try:
            output = json.loads(step.output)
        except json.JSONDecodeError:
            output = {"raw": step.output}
    logs: list[str] | None = None
    if step.logs:
        try:
            logs = json.loads(step.logs)
        except json.JSONDecodeError:
            logs = [step.logs]
    duration_ms = None
    if step.started_at and step.finished_at:
        duration_ms = round((step.finished_at - step.started_at).total_seconds() * 1000)
    return AgentStepResponse(
        id=step.id,
        agent=step.agent,
        status=step.status,
        output=output,
        logs=logs,
        duration_ms=duration_ms,
        started_at=step.started_at,
        finished_at=step.finished_at,
        iteration=step.iteration or 1,
        input_artifacts=step.input_artifacts,
        model_used=step.model_used,
        token_usage=step.token_usage,
        feedback=step.feedback,
        error=step.error,
    )


@agents_router.get(
    "/definitions",
    response_model=list[AgentDefinitionResponse],
    summary="Agent catalog",
    dependencies=[Depends(get_current_user)],
)
async def definitions() -> list[AgentDefinitionResponse]:
    return agent_definitions()


@agents_router.post(
    "/run",
    response_model=RunAcceptedResponse,
    status_code=202,
    summary="Start a multi-agent pipeline run",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def run_pipeline(
    payload: AgentRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
    settings: Settings = SettingsDep,
) -> RunAcceptedResponse:
    resolved_mode = agent_service.resolve_mode(payload.mode, settings)
    run = await agent_service.create_run(
        db,
        current_user,
        project_id=payload.project_id,
        requirements=payload.requirements,
        preferred_stack=payload.preferred_stack,
        mode=resolved_mode,
    )
    agent_service.start_run(run.id)
    logger.info(
        "Agent run started {run_id} mode={mode}",
        run_id=run.id,
        mode=resolved_mode,
    )
    return RunAcceptedResponse(run_id=run.id, status=run.status, mode=run.mode)


@agents_router.post(
    "/retry/{run_id}",
    response_model=RunAcceptedResponse,
    status_code=202,
    summary="Retry a failed pipeline from the failed agent",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def retry_run(
    run_id: RunId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> RunAcceptedResponse:
    """Resume a failed run from the agent that failed, reusing completed
    artifacts (Phase 4.0). Returns the new run id."""
    run = await agent_service.retry_run(db, current_user, run_id)
    return RunAcceptedResponse(run_id=run.id, status=run.status, mode=run.mode)


@agents_router.post(
    "/cancel/{run_id}",
    response_model=RunStatusResponse,
    summary="Cancel a queued or running pipeline",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def cancel_run(
    run_id: RunId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> RunStatusResponse:
    run = await agent_service.cancel_run(db, current_user, run_id)
    return _status(run)


@agents_router.get("/status/{run_id}", response_model=RunStatusResponse, summary="Run status")
async def run_status(
    run_id: RunId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> RunStatusResponse:
    run = await agent_service.get_run_for_user(db, current_user, run_id)
    return _status(run)


@agents_router.get("/output/{run_id}", response_model=RunOutputResponse, summary="Run output")
async def run_output(
    run_id: RunId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> RunOutputResponse:
    run = await agent_service.get_run_for_user(db, current_user, run_id)
    steps = await agent_service.get_run_steps(db, run_id)
    return RunOutputResponse(
        run=_status(run),
        requirements=run.requirements,
        steps=[_step(step) for step in steps],
    )


def _preview(value: str | None, limit: int = 200) -> str | None:
    """Truncate long text for list payloads (requirements can reach 100k chars)."""
    if value is None or len(value) <= limit:
        return value
    return f"{value[: limit - 3]}..."


@agents_router.get("/history", response_model=RunHistoryResponse, summary="Run history")
async def run_history(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    project_id: Annotated[uuid.UUID | None, Query(description="Filter by project")] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> RunHistoryResponse:
    runs, total = await agent_service.list_runs(
        db, current_user, page=page, page_size=page_size, project_id=project_id
    )
    return RunHistoryResponse(
        items=[
            RunHistoryItem(
                id=run.id,
                status=run.status,
                mode=run.mode,
                requirements=_preview(run.requirements),
                current_step=run.current_step,
                progress=agent_service.progress(run),
                created_at=run.created_at,
                finished_at=run.finished_at,
            )
            for run in runs
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@agents_router.delete(
    "/history/{run_id}",
    status_code=204,
    summary="Delete a run from history",
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
)
async def delete_history(
    run_id: RunId,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = SessionDep,
) -> Response:
    await agent_service.delete_run(db, current_user, run_id)
    return Response(status_code=204)
