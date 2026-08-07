"""Long-term project memory (MAD §5 — Project Memory).

Short-term memory lives in the LangGraph state (`conversation_history`).
Long-term memory persists per-project knowledge across runs so later runs can
reference prior decisions, and execution history is the `agent_runs` /
`agent_steps` tables.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import ProjectMemory


async def load_project_memory(db: AsyncSession, project_id: uuid.UUID | None) -> dict[str, str]:
    """Return every stored knowledge key for a project (empty when no project)."""
    if project_id is None:
        return {}
    result = await db.execute(select(ProjectMemory).where(ProjectMemory.project_id == project_id))
    return {record.key: record.value for record in result.scalars().all()}


async def remember(db: AsyncSession, project_id: uuid.UUID | None, key: str, value: str) -> None:
    """Upsert a single knowledge item for a project."""
    if project_id is None:
        return
    record = await db.scalar(
        select(ProjectMemory).where(
            ProjectMemory.project_id == project_id, ProjectMemory.key == key
        )
    )
    if record is None:
        db.add(ProjectMemory(project_id=project_id, key=key, value=value))
    else:
        record.value = value
    await db.commit()
