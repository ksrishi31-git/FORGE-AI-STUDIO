"""Phase 4.0 agent workflow: shared context, rich step metadata, review fields

Revision ID: 0007_agent_workflow
Revises: 0006_remove_viewer_role_add_company
Create Date: 2026-08-08

The upgraded agent workflow persists a shared project context per run
(`agent_runs.context`), records execution metadata on every step (iteration,
input artifacts, model, token usage, feedback, error), adds a
`needs_revision` step state for the reviewer feedback loop, stores review
verdict/score/iteration on the run, and mirrors per-project context into the
new `project_contexts` table so execution state survives reloads and retries.
Batch mode keeps the changes portable across PostgreSQL and SQLite.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_agent_workflow"
down_revision: str | None = "0006_remove_viewer_role_add_company"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("agent_steps") as batch_op:
        batch_op.add_column(
            sa.Column("iteration", sa.Integer(), server_default=sa.text("1"), nullable=False)
        )
        batch_op.add_column(sa.Column("input_artifacts", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("model_used", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("token_usage", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("feedback", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("error", sa.Text(), nullable=True))
        batch_op.drop_constraint("ck_agent_steps_status", type_="check")
        batch_op.create_check_constraint(
            "ck_agent_steps_status",
            "status IN ('pending', 'running', 'completed', 'failed', 'needs_revision', 'skipped')",
        )

    with op.batch_alter_table("agent_runs") as batch_op:
        batch_op.add_column(sa.Column("context", sa.JSON(), nullable=True))
        batch_op.add_column(
            sa.Column("iteration", sa.Integer(), server_default=sa.text("1"), nullable=False)
        )
        batch_op.add_column(sa.Column("verdict", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("overall_score", sa.Integer(), nullable=True))

    op.create_table(
        "project_contexts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("project_name", sa.String(length=200), nullable=True),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("preferred_stack", sa.JSON(), nullable=True),
        sa.Column("artifacts", sa.JSON(), nullable=True),
        sa.Column("execution_status", sa.String(length=30), nullable=True),
        sa.Column("iteration", sa.Integer(), server_default=sa.text("1"), nullable=False),
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
        sa.UniqueConstraint("project_id", name="uq_project_contexts_project_id"),
    )
    op.create_index("ix_project_contexts_project_id", "project_contexts", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_project_contexts_project_id", table_name="project_contexts")
    op.drop_table("project_contexts")

    with op.batch_alter_table("agent_runs") as batch_op:
        batch_op.drop_column("overall_score")
        batch_op.drop_column("verdict")
        batch_op.drop_column("iteration")
        batch_op.drop_column("context")

    with op.batch_alter_table("agent_steps") as batch_op:
        batch_op.drop_constraint("ck_agent_steps_status", type_="check")
        batch_op.create_check_constraint(
            "ck_agent_steps_status",
            "status IN ('pending', 'running', 'completed', 'failed', 'skipped')",
        )
        batch_op.drop_column("error")
        batch_op.drop_column("feedback")
        batch_op.drop_column("token_usage")
        batch_op.drop_column("model_used")
        batch_op.drop_column("input_artifacts")
        batch_op.drop_column("iteration")
