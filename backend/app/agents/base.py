"""Reusable agent definition (MAD §2 — every department is an Agent)."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from pydantic import BaseModel


@dataclass(frozen=True)
class Agent:
    """A specialist agent: identity, system prompt, and I/O contracts.

    One class powers both execution modes — the LangChain LLM path and the
    deterministic engine — so the workflow graph never branches on how an
    agent produces its output.
    """

    key: str
    name: str
    role: str
    description: str
    order: int
    system_prompt: str
    output_schema: type[BaseModel]
    input_schema: type[BaseModel] | None = None
    context_builder: Callable[[dict], dict] | None = None
    deterministic_fn: Callable[[dict], dict] = field(default=lambda ctx: {})

    def build_context(self, state: dict) -> dict:
        """Extract and validate this agent's input from the shared state."""
        raw = self.context_builder(state) if self.context_builder is not None else state
        if self.input_schema is None:
            return raw
        return self.input_schema.model_validate(raw).model_dump()

    def run_deterministic(self, context: dict) -> dict:
        """Produce the artifact with the rule-based engine (no LLM required)."""
        return self.deterministic_fn(context)
