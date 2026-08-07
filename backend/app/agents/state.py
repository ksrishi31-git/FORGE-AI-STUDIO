"""Shared project state flowing through the LangGraph pipeline (MAD §4).

`conversation_history` uses an additive reducer so the parallel backend and
frontend branches can append without clobbering each other. Every other key
is written by exactly one node at a time, so plain overwrite is safe.
"""

from __future__ import annotations

import operator
from typing import Annotated, TypedDict


class AgentState(TypedDict, total=False):
    # --- Run identity ---
    run_id: str
    project_id: str | None
    project_name: str
    mode: str  # "llm" | "deterministic"

    # --- Inputs ---
    requirements: str
    preferred_stack: list[str]

    # --- Long-term memory (loaded from ProjectMemory at start) ---
    project_memory: dict[str, str]

    # --- Conversation / short-term memory ---
    conversation_history: Annotated[list[str], operator.add]

    # --- Artifacts produced by each stage ---
    product_requirements: dict
    architecture: dict
    backend_output: dict
    frontend_output: dict
    database_schema: dict
    qa_report: dict
    security_report: dict
    deployment_plan: dict
    documentation: dict
    review: dict

    # --- Reflection loop ---
    review_count: int
    revision_feedback: list[str]
    # Per-agent feedback routed by the Reviewer (agent key → actionable issues).
    agent_feedback: dict[str, list[str]]
    # Append-only log of feedback rounds, for the Inspector / Logs views.
    feedback_history: list[dict]
    # Review/iteration counter for the current run.
    iteration: int
    # When set, the graph starts at this agent instead of product_manager
    # (retry of a failed run resumes from the failed step).
    resume_from: str | None
