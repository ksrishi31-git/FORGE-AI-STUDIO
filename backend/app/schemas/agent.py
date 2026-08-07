"""Multi-agent engine API schemas (Phase 3.5)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.agents.definitions import AGENT_CATALOG


class AgentRunRequest(BaseModel):
    project_id: uuid.UUID | None = Field(default=None)
    requirements: str = Field(min_length=1, max_length=100000)
    preferred_stack: list[str] | None = Field(default=None, max_length=50)
    mode: str = Field(default="auto", description="auto | llm | deterministic")

    @field_validator("mode")
    @classmethod
    def _valid_mode(cls, value: str) -> str:
        if value not in ("auto", "llm", "deterministic"):
            raise ValueError("mode must be auto, llm, or deterministic")
        return value

    @field_validator("requirements")
    @classmethod
    def _strip_requirements(cls, value: str) -> str:
        return value.strip()


class RunAcceptedResponse(BaseModel):
    run_id: uuid.UUID
    status: str
    mode: str


class AgentDefinitionResponse(BaseModel):
    key: str
    name: str
    role: str
    description: str
    order: int


class RunStatusResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID | None
    status: str
    mode: str
    current_step: str | None
    total_steps: int
    completed_steps: int
    progress: int = Field(ge=0, le=100)
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    # Review metadata (Phase 4.0)
    iteration: int = 1
    verdict: str | None = None
    overall_score: int | None = None


class AgentStepResponse(BaseModel):
    id: uuid.UUID
    agent: str
    status: str
    output: dict | None
    logs: list[str] | None
    duration_ms: int | None
    started_at: datetime | None
    finished_at: datetime | None
    # Execution metadata (Phase 4.0)
    iteration: int = 1
    input_artifacts: list[str] | None = None
    model_used: str | None = None
    token_usage: int | None = None
    feedback: list[str] | None = None
    error: str | None = None


class RunOutputResponse(BaseModel):
    run: RunStatusResponse
    requirements: str | None
    steps: list[AgentStepResponse]


class RunHistoryItem(BaseModel):
    id: uuid.UUID
    status: str
    mode: str
    requirements: str | None
    current_step: str | None
    progress: int = Field(ge=0, le=100)
    created_at: datetime
    finished_at: datetime | None


class RunHistoryResponse(BaseModel):
    items: list[RunHistoryItem]
    total: int
    page: int
    page_size: int


def agent_definitions() -> list[AgentDefinitionResponse]:
    return [
        AgentDefinitionResponse(
            key=agent.key,
            name=agent.name,
            role=agent.role,
            description=agent.description,
            order=agent.order,
        )
        for agent in sorted(AGENT_CATALOG, key=lambda item: item.order)
    ]
