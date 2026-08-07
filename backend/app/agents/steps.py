"""Per-step persistence for graph nodes (Phase 3.5, Phase 4.0).

Each graph node opens its own short-lived session so concurrent parallel
branches never share a connection (the Phase 4.0 pipeline is linear, but the
pattern stays). Short write operations are serialized with a per-loop asyncio
lock: required on SQLite (single shared connection, one writer at a time) and
harmless on PostgreSQL.

Phase 4.0 also keeps the run's shared context current: every completed
artifact is merged into `agent_runs.context` so a failed/crashed run can be
retried or restored without re-walking the pipeline.
"""

from __future__ import annotations

import asyncio
import json
import uuid
import weakref
from datetime import UTC, datetime

from sqlalchemy import select, update

from app.database.session import get_session_factory
from app.models.agent import AgentRun, AgentStep, AgentStepStatus

# A lock bound to the currently running event loop (tests create a new loop
# per `asyncio.run`, so a module-level lock would be bound to a dead loop).
_locks: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()

# Runs the user asked to cancel. The executor checks this registry between
# graph nodes; a process restart clears it, and `reconcile_stale_runs` fails
# any run that never observed the request.
_cancelled: set[uuid.UUID] = set()


def request_cancel(run_id: uuid.UUID) -> None:
    """Record a user-requested cancellation; the executor honours it at the
    next node boundary."""
    _cancelled.add(run_id)


def is_cancelled(run_id: uuid.UUID) -> bool:
    """True when the user requested this run be cancelled."""
    return run_id in _cancelled


def forget_cancel(run_id: uuid.UUID) -> None:
    """Drop a run from the registry once it reached a terminal state, so the
    set never grows without bound on long-running servers."""
    _cancelled.discard(run_id)


def _write_lock() -> asyncio.Lock:
    loop = asyncio.get_running_loop()
    lock = _locks.get(loop)
    if lock is None:
        lock = asyncio.Lock()
        _locks[loop] = lock
    return lock


def _now() -> datetime:
    return datetime.now(UTC)


async def start_step(
    run_id: uuid.UUID,
    agent: str,
    *,
    iteration: int = 1,
    input_artifacts: list[str] | None = None,
    feedback: list[str] | None = None,
) -> uuid.UUID:
    """Record a step as running; update the run's current step and status."""
    async with _write_lock():
        return await _start_step(
            run_id,
            agent,
            iteration=iteration,
            input_artifacts=input_artifacts,
            feedback=feedback,
        )


async def _start_step(
    run_id: uuid.UUID,
    agent: str,
    *,
    iteration: int,
    input_artifacts: list[str] | None,
    feedback: list[str] | None,
) -> uuid.UUID:
    factory = get_session_factory()
    async with factory() as session:
        step = AgentStep(
            run_id=run_id,
            agent=agent,
            status=AgentStepStatus.RUNNING.value,
            started_at=_now(),
            iteration=iteration,
            input_artifacts=input_artifacts,
            feedback=feedback,
        )
        session.add(step)
        await session.flush()
        await session.execute(
            update(AgentRun)
            .where(AgentRun.id == run_id)
            .values(current_step=agent, status="running")
        )
        await session.commit()
        return step.id


async def complete_step(
    run_id: uuid.UUID,
    step_id: uuid.UUID,
    *,
    agent: str,
    output: dict,
    duration_seconds: float,
    state_key: str | None = None,
    model_used: str | None = None,
    token_usage: int | None = None,
    feedback: list[str] | None = None,
    iteration: int = 1,
) -> None:
    """Record a completed step, advance the run's counter, and merge the
    artifact into the run's shared context."""
    async with _write_lock():
        await _complete_step(
            run_id,
            step_id,
            agent=agent,
            output=output,
            duration_seconds=duration_seconds,
            state_key=state_key,
            model_used=model_used,
            token_usage=token_usage,
            feedback=feedback,
            iteration=iteration,
        )


async def _complete_step(
    run_id: uuid.UUID,
    step_id: uuid.UUID,
    *,
    agent: str,
    output: dict,
    duration_seconds: float,
    state_key: str | None,
    model_used: str | None,
    token_usage: int | None,
    feedback: list[str] | None,
    iteration: int,
) -> None:
    factory = get_session_factory()
    logs = [
        f"Agent {agent} started",
        f"Iteration {iteration}",
        f"Execution mode: {model_used or 'deterministic'}",
    ]
    if token_usage is not None:
        logs.append(f"Token usage: {token_usage}")
    if feedback:
        logs.append("Reviewer feedback addressed: " + "; ".join(feedback))
    logs.append(f"Agent {agent} completed in {duration_seconds:.1f}s")
    async with factory() as session:
        await session.execute(
            update(AgentStep)
            .where(AgentStep.id == step_id)
            .values(
                status=AgentStepStatus.COMPLETED.value,
                output=json.dumps(output, default=str),
                logs=json.dumps(logs),
                finished_at=_now(),
                model_used=model_used,
                token_usage=token_usage,
                feedback=feedback,
            )
        )
        await session.execute(
            update(AgentRun)
            .where(AgentRun.id == run_id)
            .values(completed_steps=AgentRun.completed_steps + 1)
        )
        if state_key is not None:
            run = await session.get(AgentRun, run_id)
            if run is not None:
                context = dict(run.context or {})
                context[state_key] = output
                run.context = context
        await session.commit()


async def fail_step(
    run_id: uuid.UUID, step_id: uuid.UUID, *, agent: str, error: str | None = None
) -> None:
    async with _write_lock():
        await _fail_step(run_id, step_id, agent=agent, error=error)


async def _fail_step(
    run_id: uuid.UUID, step_id: uuid.UUID, *, agent: str, error: str | None
) -> None:
    factory = get_session_factory()
    logs = [f"Agent {agent} failed"]
    if error:
        logs.append(f"Error: {error[:500]}")
    async with factory() as session:
        await session.execute(
            update(AgentStep)
            .where(AgentStep.id == step_id)
            .values(
                status=AgentStepStatus.FAILED.value,
                logs=json.dumps(logs),
                finished_at=_now(),
                error=error,
            )
        )
        await session.commit()


async def mark_needs_revision(
    run_id: uuid.UUID, agent: str, feedback: list[str] | None = None
) -> None:
    """Flag the latest step of `agent` as needing revision (reviewer routed
    feedback to it). The agent re-runs and appends a fresh completed step."""
    async with _write_lock():
        factory = get_session_factory()
        async with factory() as session:
            step = await session.scalar(
                select(AgentStep)
                .where(AgentStep.run_id == run_id, AgentStep.agent == agent)
                .order_by(AgentStep.created_at.desc())
            )
            if step is None:
                return
            logs = json.loads(step.logs or "[]")
            detail = f": {'; '.join(feedback[:5])}" if feedback else ""
            logs.append("Reviewer requested revision" + detail)
            step.status = AgentStepStatus.NEEDS_REVISION.value
            step.logs = json.dumps(logs)
            await session.commit()
