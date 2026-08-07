"""Create agent engine tables

Revision ID: 0003_agent_engine
Revises: 0002_projects
Create Date: 2026-08-07

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_agent_engine"
down_revision: str | None = "0002_projects"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'queued'"),
            nullable=False,
        ),
        sa.Column(
            "mode",
            sa.String(length=20),
            server_default=sa.text("'deterministic'"),
            nullable=False,
        ),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("preferred_stack", sa.JSON(), nullable=True),
        sa.Column("current_step", sa.String(length=80), nullable=True),
        sa.Column("total_steps", sa.Integer(), server_default=sa.text("10"), nullable=False),
        sa.Column("completed_steps", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'completed', 'failed')",
            name="ck_agent_runs_status",
        ),
        sa.CheckConstraint(
            "mode IN ('llm', 'deterministic')", name="ck_agent_runs_mode"
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_runs_owner_id", "agent_runs", ["owner_id"])
    op.create_index("ix_agent_runs_project_id", "agent_runs", ["project_id"])
    op.create_index("ix_agent_runs_status", "agent_runs", ["status"])

    op.create_table(
        "agent_steps",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("agent", sa.String(length=80), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("output", sa.Text(), nullable=True),
        sa.Column("logs", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed', 'skipped')",
            name="ck_agent_steps_status",
        ),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_steps_agent", "agent_steps", ["agent"])
    op.create_index("ix_agent_steps_run_id", "agent_steps", ["run_id"])

    op.create_table(
        "project_memories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "key", name="uq_project_memories_project_key"),
    )
    op.create_index("ix_project_memories_project_id", "project_memories", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_project_memories_project_id", table_name="project_memories")
    op.drop_table("project_memories")
    op.drop_index("ix_agent_steps_run_id", table_name="agent_steps")
    op.drop_index("ix_agent_steps_agent", table_name="agent_steps")
    op.drop_table("agent_steps")
    op.drop_index("ix_agent_runs_status", table_name="agent_runs")
    op.drop_index("ix_agent_runs_project_id", table_name="agent_runs")
    op.drop_index("ix_agent_runs_owner_id", table_name="agent_runs")
    op.drop_table("agent_runs")
