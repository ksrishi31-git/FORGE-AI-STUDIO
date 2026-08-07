"""Allow cancelled agent runs

Revision ID: 0004_workspace_cancel
Revises: 0003_agent_engine
Create Date: 2026-08-07

The Agent Workspace (Phase 3.6) lets users cancel a running pipeline. The
run status check constraint must admit 'cancelled' so the workspace UI can
reflect an abandoned execution. Batch mode keeps the migration portable
across PostgreSQL and SQLite.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_workspace_cancel"
down_revision: str | None = "0003_agent_engine"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("agent_runs") as batch_op:
        batch_op.drop_constraint("ck_agent_runs_status", type_="check")
        batch_op.create_check_constraint(
            "ck_agent_runs_status",
            "status IN ('queued', 'running', 'completed', 'failed', 'cancelled')",
        )


def downgrade() -> None:
    with op.batch_alter_table("agent_runs") as batch_op:
        batch_op.drop_constraint("ck_agent_runs_status", type_="check")
        batch_op.create_check_constraint(
            "ck_agent_runs_status",
            "status IN ('queued', 'running', 'completed', 'failed')",
        )
