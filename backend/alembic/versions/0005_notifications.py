"""Create notifications table

Revision ID: 0005_notifications
Revises: 0004_workspace_cancel
Create Date: 2026-08-07

Phase 3.10 wires platform notifications (run completion, failure, and
cancellation) into the top-bar notification menu.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_notifications"
down_revision: str | None = "0004_workspace_cancel"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read", sa.Boolean(), server_default=sa.text("0"), nullable=False),
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
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_owner_id", "notifications", ["owner_id"])
    op.create_index("ix_notifications_run_id", "notifications", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_run_id", table_name="notifications")
    op.drop_index("ix_notifications_owner_id", table_name="notifications")
    op.drop_table("notifications")
