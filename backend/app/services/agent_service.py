"""Multi-agent engine service (Phase 3.5, Phase 4.0).

Runs are executed as in-process asyncio tasks: `POST /agents/run` persists a
queued run and hands it to the LangGraph executor immediately. The run row and
its step rows are the source of truth for status, output, and history.

Phase 4.0:
- Every completed artifact is merged into `run.context` (the shared project
  context), so a failed run can be retried from the failed agent without
  losing completed work, and execution state survives reloads.
- The final review verdict/score/iteration are persisted on the run.
- Per-project context is mirrored into `project_contexts` for restoration.
- `POST /agents/retry/{run_id}` resumes a failed run from the failed agent.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import steps
from app.agents.graph import RunCancelledError, build_agent_graph
from app.config.settings import Settings
from app.core.errors import AppError, ErrorCode
from app.core.logging import get_logger
from app.database.session import get_session_factory
from app.memory import memory_service
from app.models.agent import (
    AgentMode,
    AgentRun,
    AgentRunStatus,
    AgentStep,
    AgentStepStatus,
    ProjectContext,
)
from app.models.notification import Notification
from app.models.user import Role, User
from app.services.project_service import get_project_for_user

logger = get_logger(__name__)

_running_tasks: set[asyncio.Task] = set()

# Shared-context artifact keys (state keys written by the ten agents).
_ARTIFACT_KEYS = frozenset(
    {
        "product_requirements",
        "architecture",
        "database_schema",
        "backend_output",
        "frontend_output",
        "qa_report",
        "security_report",
        "deployment_plan",
        "documentation",
        "review",
    }
)

# The ten agent keys in execution order (mirrors the graph catalog) — used to
# validate resume targets and to decide which completed steps a retried run may
# carry over from the failed run.
_AGENT_KEYS = frozenset(
    {
        "product_manager",
        "solution_architect",
        "database_architect",
        "backend_engineer",
        "frontend_engineer",
        "qa_engineer",
        "security_auditor",
        "devops_engineer",
        "technical_writer",
        "reviewer",
    }
)
_PIPELINE_ORDER = [
    "product_manager",
    "solution_architect",
    "database_architect",
    "backend_engineer",
    "frontend_engineer",
    "qa_engineer",
    "security_auditor",
    "devops_engineer",
    "technical_writer",
    "reviewer",
]


def resolve_mode(requested: str, settings: Settings) -> str:
    """Resolve the execution mode for a new run (auto prefers the LLM)."""
    llm_available = bool(settings.llm_api_key)
    if requested == "llm" and not llm_available:
        raise AppError(
            code=ErrorCode.PROVIDER_UNAVAILABLE,
            message=(
                "No LLM provider is configured. Set LLM_API_KEY or request the deterministic mode."
            ),
            status_code=400,
        )
    if requested == "llm":
        return AgentMode.LLM.value
    if requested == "deterministic":
        return AgentMode.DETERMINISTIC.value
    return AgentMode.LLM.value if llm_available else AgentMode.DETERMINISTIC.value


# --- Lifecycle ----------------------------------------------------------------------


async def create_run(
    db: AsyncSession,
    user: User,
    *,
    project_id: uuid.UUID | None,
    requirements: str,
    preferred_stack: list[str] | None,
    mode: str,
) -> AgentRun:
    if project_id is not None:
        await get_project_for_user(db, user, project_id)
    run = AgentRun(
        owner_id=user.id,
        project_id=project_id,
        requirements=requirements,
        preferred_stack=preferred_stack or None,
        mode=mode,
        status="queued",
        total_steps=10,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


def start_run(run_id: uuid.UUID, seed_state: dict | None = None) -> None:
    """Dispatch a run to the in-process executor (fire and forget)."""
    task = asyncio.create_task(execute_run(run_id, seed_state))
    _running_tasks.add(task)

    def _on_done(done: asyncio.Task) -> None:
        _running_tasks.discard(done)
        if done.cancelled() or done.exception() is None:
            return
        # Anything escaping the executor's internal handlers leaves the run
        # stranded in a non-terminal state; surface it so a pipeline start is
        # never a silent failure.
        logger.error(
            "Agent run {run_id} executor crashed: {error}",
            run_id=run_id,
            error=done.exception(),
        )

    task.add_done_callback(_on_done)
    logger.info("Agent pipeline started {run_id}", run_id=run_id)


async def cancel_run(db: AsyncSession, user: User, run_id: uuid.UUID) -> AgentRun:
    """Cancel a queued or running pipeline.

    Idempotent: the executor observes the cancellation registry at the next
    node boundary and stops; terminal runs are returned unchanged.
    """
    run = await get_run_for_user(db, user, run_id)
    if run.status in (AgentRunStatus.QUEUED.value, AgentRunStatus.RUNNING.value):
        steps.request_cancel(run.id)
        run.status = AgentRunStatus.CANCELLED.value
        run.finished_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(run)
    return run


async def retry_run(db: AsyncSession, user: User, run_id: uuid.UUID) -> AgentRun:
    """Retry a failed run from the failed agent, reusing completed artifacts.

    The new run is seeded from the previous run's shared context (or rebuilt
    from its completed steps) and resumes at the agent that failed — completed
    work is never lost and the pipeline is never restarted from scratch.
    """
    previous = await get_run_for_user(db, user, run_id)
    if previous.status != AgentRunStatus.FAILED.value:
        raise AppError(
            code=ErrorCode.CONFLICT,
            message="Only a failed run can be retried.",
            status_code=409,
        )
    failed_step = await db.scalar(
        select(AgentStep)
        .where(AgentStep.run_id == run_id, AgentStep.status == AgentStepStatus.FAILED.value)
        .order_by(AgentStep.created_at.desc())
    )
    resume_from = (
        failed_step.agent
        if failed_step is not None
        else previous.current_step or "backend_engineer"
    )
    if resume_from not in _AGENT_KEYS:
        resume_from = "product_manager"

    context = previous.context or await _rebuild_context_from_steps(db, run_id)

    run = AgentRun(
        owner_id=user.id,
        project_id=previous.project_id,
        requirements=previous.requirements,
        preferred_stack=previous.preferred_stack,
        mode=previous.mode,
        status="queued",
        total_steps=10,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Carry every completed step from agents *before* the resume point into the
    # new run (with fresh ids). The graph re-runs only the failed agent and its
    # downstream dependents, so the retried run's timeline still shows the work
    # that was reused instead of leaving it blank/pending — completed work is
    # never lost and never presented as missing.
    resume_index = _PIPELINE_ORDER.index(resume_from) if resume_from in _PIPELINE_ORDER else 0
    prior = await db.scalars(
        select(AgentStep)
        .where(
            AgentStep.run_id == run_id,
            AgentStep.status == AgentStepStatus.COMPLETED.value,
        )
        .order_by(AgentStep.created_at)
    )
    carried = 0
    for step in prior.all():
        if step.agent not in _PIPELINE_ORDER:
            continue
        if _PIPELINE_ORDER.index(step.agent) >= resume_index:
            continue
        db.add(
            AgentStep(
                run_id=run.id,
                agent=step.agent,
                status=AgentStepStatus.COMPLETED.value,
                output=step.output,
                logs=step.logs,
                started_at=step.started_at,
                finished_at=step.finished_at,
                iteration=step.iteration or 1,
                input_artifacts=step.input_artifacts,
                model_used=step.model_used,
                token_usage=step.token_usage,
                feedback=step.feedback,
            )
        )
        carried += 1
    if carried:
        run.completed_steps = carried
        await db.commit()
        await db.refresh(run)

    project_name = "Untitled Project"
    if run.project_id is not None:
        from app.models.project import Project

        project = await db.get(Project, run.project_id)
        project_name = project.name if project is not None else project_name

    seed: dict = {
        "run_id": str(run.id),
        "project_id": str(run.project_id) if run.project_id else None,
        "project_name": project_name,
        "mode": run.mode,
        "requirements": run.requirements or "",
        "preferred_stack": run.preferred_stack or [],
        "project_memory": await memory_service.load_project_memory(db, run.project_id),
        "conversation_history": [],
        "review_count": 0,
        "iteration": int((context or {}).get("iteration") or 1),
        "agent_feedback": (context or {}).get("agent_feedback") or {},
        "revision_feedback": (context or {}).get("revision_feedback") or [],
        "feedback_history": (context or {}).get("feedback_history") or [],
        "resume_from": resume_from,
    }
    # Seed every previously completed artifact so downstream agents consume it.
    for key in _ARTIFACT_KEYS:
        if key in (context or {}):
            seed[key] = context[key]

    # Persist the full seed (resume target + iteration + feedback + artifacts)
    # on the run row so ANY execution path — the fire-and-forget task or a
    # worker retrying later — resumes from the failed agent, not the start.
    run.context = seed
    run.iteration = seed["iteration"]
    await db.commit()
    start_run(run.id)
    logger.info(
        "Agent run {new_run} retrying {old_run} from {agent}",
        new_run=run.id,
        old_run=run_id,
        agent=resume_from,
    )
    return run


async def _rebuild_context_from_steps(db: AsyncSession, run_id: uuid.UUID) -> dict:
    """Rebuild the shared context from completed step outputs (fallback when
    the run crashed before the incremental context was written)."""
    from app.agents.graph import state_key_for

    result = await db.execute(
        select(AgentStep).where(
            AgentStep.run_id == run_id, AgentStep.status == AgentStepStatus.COMPLETED.value
        )
    )
    context: dict = {}
    for step in result.scalars().all():
        key = state_key_for(step.agent)
        if step.output:
            import json

            try:
                context[key] = json.loads(step.output)
            except json.JSONDecodeError:
                context[key] = {"raw": step.output}
    return context


async def _notify(
    session: AsyncSession,
    *,
    owner_id: uuid.UUID,
    run_id: uuid.UUID | None,
    title: str,
    body: str,
) -> None:
    """Persist a user notification."""
    session.add(Notification(owner_id=owner_id, run_id=run_id, title=title, body=body, read=False))


async def _persist_project_context(
    session: AsyncSession, run: AgentRun, state: dict, execution_status: str
) -> None:
    """Mirror the run's shared context into the per-project context row."""
    if run.project_id is None:
        return
    artifacts = {key: state[key] for key in _ARTIFACT_KEYS if key in state}
    row = await session.scalar(
        select(ProjectContext).where(ProjectContext.project_id == run.project_id)
    )
    if row is None:
        session.add(
            ProjectContext(
                project_id=run.project_id,
                project_name=state.get("project_name"),
                requirements=run.requirements,
                preferred_stack=run.preferred_stack,
                artifacts=artifacts,
                execution_status=execution_status,
                iteration=run.iteration or 1,
            )
        )
    else:
        row.project_name = state.get("project_name")
        row.requirements = run.requirements
        row.preferred_stack = run.preferred_stack
        row.artifacts = artifacts
        row.execution_status = execution_status
        row.iteration = run.iteration or 1


async def execute_run(run_id: uuid.UUID, seed_state: dict | None = None) -> None:
    """Run the LangGraph pipeline for one run, persisting results to the DB."""
    factory = get_session_factory()

    async with factory() as session:
        run = await session.get(AgentRun, run_id)
        if run is None:
            return
        # A cancel may arrive before the executor starts; honour it immediately
        # so the run never flashes back to `running`.
        if steps.is_cancelled(run_id):
            run.status = AgentRunStatus.CANCELLED.value
            run.finished_at = datetime.now(UTC)
            run.error = None
            await _notify(
                session,
                owner_id=run.owner_id,
                run_id=run.id,
                title="Agent run cancelled",
                body="The pipeline was cancelled before it could start.",
            )
            await session.commit()
            steps.forget_cancel(run_id)
            return
        run.status = "running"
        run.started_at = datetime.now(UTC)
        await session.commit()
        project_name = "Untitled Project"
        if run.project_id is not None:
            from app.models.project import Project

            project = await session.get(Project, run.project_id)
            project_name = project.name if project is not None else project_name
        project_memory = await memory_service.load_project_memory(session, run.project_id)

    if seed_state is not None:
        state: dict = dict(seed_state)
    elif (run.context or {}).get("resume_from"):
        # A retried run: rebuild the seed from the persisted context and resume
        # at the failed agent, reusing every completed artifact.
        seed = run.context
        state = {
            "run_id": str(run_id),
            "project_id": str(run.project_id) if run.project_id else None,
            "project_name": project_name,
            "mode": run.mode,
            "requirements": run.requirements or "",
            "preferred_stack": run.preferred_stack or [],
            "project_memory": project_memory,
            "conversation_history": [],
            "review_count": 0,
            "iteration": int(seed.get("iteration") or 1),
            "agent_feedback": seed.get("agent_feedback") or {},
            "revision_feedback": seed.get("revision_feedback") or [],
            "feedback_history": seed.get("feedback_history") or [],
            "resume_from": seed.get("resume_from"),
        }
        for key in _ARTIFACT_KEYS:
            if key in seed:
                state[key] = seed[key]
    else:
        state = {
            "run_id": str(run_id),
            "project_id": str(run.project_id) if run.project_id else None,
            "project_name": project_name,
            "mode": run.mode,
            "requirements": run.requirements or "",
            "preferred_stack": run.preferred_stack or [],
            "project_memory": project_memory,
            "conversation_history": [],
            "review_count": 0,
            "iteration": 1,
            "agent_feedback": {},
            "revision_feedback": [],
            "feedback_history": [],
            "resume_from": None,
        }

    try:
        graph = build_agent_graph()
        # The reviewer reflection loop re-walks up to ~10 nodes per cycle; the
        # default 25-step recursion limit is too tight for the bounded loop.
        final = await graph.ainvoke(state, config={"recursion_limit": 80})
    except RunCancelledError:
        # A user cancellation is a deliberate stop, not a failure: preserve the
        # `cancelled` status the cancel endpoint already persisted.
        logger.info("Agent run {run_id} cancelled by user", run_id=run_id)
        async with factory() as session:
            run = await session.get(AgentRun, run_id)
            if run is not None:
                run.status = AgentRunStatus.CANCELLED.value
                run.finished_at = datetime.now(UTC)
                run.error = None
                await _notify(
                    session,
                    owner_id=run.owner_id,
                    run_id=run.id,
                    title="Agent run cancelled",
                    body="You cancelled this pipeline. Partial artifacts remain available.",
                )
                await session.commit()
        steps.forget_cancel(run_id)
        return
    except Exception as exc:  # noqa: BLE001 - any node failure fails the run
        logger.error("Agent run {run_id} failed: {error}", run_id=run_id, error=exc)
        async with factory() as session:
            run = await session.get(AgentRun, run_id)
            if run is not None:
                run.status = AgentRunStatus.FAILED.value
                run.error = str(exc)[:2000]
                run.finished_at = datetime.now(UTC)
                run.iteration = int(state.get("iteration") or 1)
                await _persist_project_context(session, run, state, "failed")
                await _notify(
                    session,
                    owner_id=run.owner_id,
                    run_id=run.id,
                    title="Agent run failed",
                    body=f"The pipeline stopped with an error: {str(exc)[:300]}",
                )
                await session.commit()
        steps.forget_cancel(run_id)
        return

    async with factory() as session:
        run = await session.get(AgentRun, run_id)
        if run is None:
            return
        # A cancel requested after the last node boundary still wins over the
        # completion write; the workspace never shows a cancelled run as done.
        cancelled = steps.is_cancelled(run_id)
        run.status = AgentRunStatus.CANCELLED.value if cancelled else AgentRunStatus.COMPLETED.value
        run.finished_at = datetime.now(UTC)
        run.error = None
        # Reflection loops append extra step rows; keep the counters honest so
        # progress and the history list reflect the real execution graph.
        step_count = await session.scalar(
            select(func.count()).select_from(AgentStep).where(AgentStep.run_id == run_id)
        )
        run.total_steps = int(step_count or 0)
        run.completed_steps = run.total_steps
        review = final.get("review") or {}
        run.verdict = review.get("verdict") or review.get("status")
        run.overall_score = review.get("overall_score")
        run.iteration = int(final.get("iteration") or state.get("iteration") or 1)
        await _persist_project_context(
            session, run, final, run.status if not cancelled else "cancelled"
        )
        if cancelled:
            await _notify(
                session,
                owner_id=run.owner_id,
                run_id=run.id,
                title="Agent run cancelled",
                body="The pipeline was cancelled after the last agent finished.",
            )
        else:
            verdict = review.get("verdict") or "approved"
            await _notify(
                session,
                owner_id=run.owner_id,
                run_id=run.id,
                title="Agent run completed",
                body=(
                    f"All 10 agents finished with a {verdict} verdict "
                    f"({review.get('overall_score', '—')}/100). "
                    "Open the workspace to explore the artifacts."
                ),
            )
        await session.commit()
        if cancelled:
            steps.forget_cancel(run_id)
        # Persist long-term project memory takeaways for future runs.
        if run.project_id is not None:
            architecture = final.get("architecture") or {}
            await memory_service.remember(
                session,
                run.project_id,
                "architecture",
                architecture.get("architecture_overview", ""),
            )
            await memory_service.remember(
                session, run.project_id, "review_verdict", review.get("verdict", "")
            )


# --- Queries -------------------------------------------------------------------------


async def get_run_for_user(db: AsyncSession, user: User, run_id: uuid.UUID) -> AgentRun:
    conditions = [AgentRun.id == run_id]
    if user.role != Role.ADMIN.value:
        conditions.append(AgentRun.owner_id == user.id)
    run = await db.scalar(select(AgentRun).where(*conditions))
    if run is None:
        raise AppError(code=ErrorCode.NOT_FOUND, message="Run not found", status_code=404)
    return run


async def list_runs(
    db: AsyncSession,
    user: User,
    *,
    page: int,
    page_size: int,
    project_id: uuid.UUID | None = None,
) -> tuple[Sequence[AgentRun], int]:
    conditions: list[object] = []
    if user.role != Role.ADMIN.value:
        conditions.append(AgentRun.owner_id == user.id)
    if project_id is not None:
        conditions.append(AgentRun.project_id == project_id)
    total = await db.scalar(select(func.count()).select_from(AgentRun).where(*conditions))
    result = await db.execute(
        select(AgentRun)
        .where(*conditions)
        .order_by(AgentRun.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all(), int(total or 0)


async def get_run_steps(db: AsyncSession, run_id: uuid.UUID) -> Sequence[AgentStep]:
    result = await db.execute(
        select(AgentStep).where(AgentStep.run_id == run_id).order_by(AgentStep.created_at)
    )
    return result.scalars().all()


async def delete_run(db: AsyncSession, user: User, run_id: uuid.UUID) -> None:
    run = await get_run_for_user(db, user, run_id)
    await db.delete(run)
    await db.commit()


async def reconcile_stale_runs(
    *,
    grace_seconds: int = 900,
    queued_grace_seconds: int = 120,
) -> int:
    """Fail orphaned queued/running runs left behind by a crash or restart.

    The executor marks runs `running` immediately, so a run still `queued`
    after `queued_grace_seconds` never started (its task died before the first
    write) and can be failed fast. `running` runs get the longer grace to
    protect genuinely long-running LLM pipelines.
    """
    factory = get_session_factory()
    now = datetime.now(UTC)
    async with factory() as session:
        result = await session.execute(
            update(AgentRun)
            .where(
                AgentRun.status == AgentRunStatus.QUEUED.value,
                AgentRun.updated_at < now - timedelta(seconds=queued_grace_seconds),
            )
            .values(
                status=AgentRunStatus.FAILED.value,
                error="Interrupted by server restart",
                finished_at=now,
            )
        )
        queued_count = result.rowcount or 0
        result = await session.execute(
            update(AgentRun)
            .where(
                AgentRun.status == AgentRunStatus.RUNNING.value,
                AgentRun.updated_at < now - timedelta(seconds=grace_seconds),
            )
            .values(
                status=AgentRunStatus.FAILED.value,
                error="Interrupted by server restart",
                finished_at=now,
            )
        )
        running_count = result.rowcount or 0
        await session.commit()
        return queued_count + running_count


def progress(run: AgentRun) -> int:
    total = max(run.total_steps, 1)
    return min(100, round(run.completed_steps / total * 100))
