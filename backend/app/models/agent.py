"""Multi-agent engine models (Phase 3.5)."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.database.base import Base, TimestampMixin


class AgentRunStatus(StrEnum):
    """Lifecycle of a pipeline run."""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentMode(StrEnum):
    """Execution backend for a run: real LLM or the deterministic engine."""

    LLM = "llm"
    DETERMINISTIC = "deterministic"


class AgentStepStatus(StrEnum):
    """Per-agent step state within a run.

    `NEEDS_REVISION` marks the step the reviewer routed feedback to; the agent
    re-runs and a fresh completed step replaces it in the pipeline view.
    """

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVISION = "needs_revision"
    SKIPPED = "skipped"


class AgentRun(Base, TimestampMixin):
    """A full pipeline execution: requirements in, reviewed artifacts out."""

    __tablename__ = "agent_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'running', 'completed', 'failed', 'cancelled')",
            name="ck_agent_runs_status",
        ),
        CheckConstraint("mode IN ('llm', 'deterministic')", name="ck_agent_runs_mode"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=AgentRunStatus.QUEUED.value, index=True
    )
    mode: Mapped[str] = mapped_column(
        String(20), nullable=False, default=AgentMode.DETERMINISTIC.value
    )
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_stack: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    current_step: Mapped[str | None] = mapped_column(String(80), nullable=True)
    total_steps: Mapped[int] = mapped_column(default=10, nullable=False)
    completed_steps: Mapped[int] = mapped_column(default=0, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # --- Shared project context (Phase 4.0) ---
    # Every completed artifact is merged into this snapshot as the run
    # progresses, so a failed/crashed run can be retried or restored without
    # re-walking the whole pipeline (and without losing completed work).
    context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # --- Review metadata (Phase 4.0) ---
    iteration: Mapped[int] = mapped_column(default=1, nullable=False)
    verdict: Mapped[str | None] = mapped_column(String(20), nullable=True)
    overall_score: Mapped[int | None] = mapped_column(nullable=True)


class AgentStep(Base, TimestampMixin):
    """One agent's execution inside a run (artifacts, logs, timing)."""

    __tablename__ = "agent_steps"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed', 'needs_revision', 'skipped')",
            name="ck_agent_steps_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=AgentStepStatus.PENDING.value
    )
    output: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Agent output (JSON).")
    logs: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Log lines (JSON list).")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # --- Execution metadata (Phase 4.0) ---
    iteration: Mapped[int] = mapped_column(default=1, nullable=False)
    input_artifacts: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True, comment="State keys consumed by this agent."
    )
    model_used: Mapped[str | None] = mapped_column(
        String(120), nullable=True, comment="llm | deterministic | provider model name."
    )
    token_usage: Mapped[int | None] = mapped_column(nullable=True)
    feedback: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True, comment="Reviewer feedback addressed by this iteration."
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class ProjectContext(Base, TimestampMixin):
    """Centralized per-project execution context (Phase 4.0).

    One row per project holds the latest shared artifact state so a project's
    execution can be restored after closing/reopening and so new runs and
    retries start from previously completed work instead of a blank slate.
    """

    __tablename__ = "project_contexts"
    __table_args__ = (UniqueConstraint("project_id", name="uq_project_contexts_project_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    project_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_stack: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    artifacts: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    execution_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    iteration: Mapped[int] = mapped_column(default=1, nullable=False)


class ProjectMemory(Base, TimestampMixin):
    """Long-term per-project knowledge shared across runs (MAD §5)."""

    __tablename__ = "project_memories"
    __table_args__ = (
        UniqueConstraint("project_id", "key", name="uq_project_memories_project_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
