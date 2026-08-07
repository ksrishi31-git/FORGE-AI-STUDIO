"""LangGraph workflow for the multi-agent pipeline (MAD §3, Phase 4.0).

The ten agents run as a strict dependency chain — every agent consumes the
outputs of the agents before it:

    product_manager → solution_architect → database_architect
        → backend_engineer → frontend_engineer → qa_engineer
        → security_auditor → devops_engineer → technical_writer → reviewer

The Reviewer is a real quality gate: when it returns NEEDS_REVISION / REJECTED
it routes feedback to the responsible agent, which re-runs together with its
downstream dependents — never the whole pipeline, never upstream agents whose
artifacts are still valid. The loop is bounded so the pipeline always
terminates.

`resume_from` lets a retried run start at the failed agent instead of the
beginning, reusing every previously completed artifact from the shared context.
"""

from __future__ import annotations

import time
import uuid

from langgraph.graph import END, START, StateGraph

from app.agents import steps
from app.agents.base import Agent
from app.agents.definitions import AGENT_CATALOG
from app.agents.llm import LlmClient
from app.agents.state import AgentState
from app.config.settings import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

MAX_REVIEW_CYCLES = 3

_llm = LlmClient(get_settings())
_graph = None

_AGENT_KEYS = [agent.key for agent in AGENT_CATALOG]
_STATE_KEY = {
    "product_manager": "product_requirements",
    "solution_architect": "architecture",
    "database_architect": "database_schema",
    "backend_engineer": "backend_output",
    "frontend_engineer": "frontend_output",
    "qa_engineer": "qa_report",
    "security_auditor": "security_report",
    "devops_engineer": "deployment_plan",
    "technical_writer": "documentation",
    "reviewer": "review",
}

# The shared-context keys each agent consumes — recorded on the step so the
# Inspector / Logs views can show real dependency data.
_INPUT_ARTIFACTS: dict[str, list[str]] = {
    "product_manager": [],
    "solution_architect": ["product_requirements"],
    "database_architect": ["architecture", "product_requirements"],
    "backend_engineer": ["architecture", "product_requirements", "database_schema"],
    "frontend_engineer": [
        "architecture",
        "product_requirements",
        "database_schema",
        "backend_output",
    ],
    "qa_engineer": ["product_requirements", "backend_output", "frontend_output", "database_schema"],
    "security_auditor": ["architecture", "backend_output", "database_schema"],
    "devops_engineer": ["architecture", "backend_output", "product_requirements"],
    "technical_writer": [
        "product_requirements",
        "architecture",
        "backend_output",
        "frontend_output",
        "database_schema",
        "deployment_plan",
    ],
    "reviewer": [
        "product_requirements",
        "architecture",
        "backend_output",
        "frontend_output",
        "database_schema",
        "qa_report",
        "security_report",
        "deployment_plan",
        "documentation",
    ],
}


class RunCancelledError(Exception):
    """Raised inside a graph node when the user cancelled the run.

    The executor catches this before the generic failure handler so a
    cancellation surfaces as `cancelled` (never `failed`).
    """


def _node_for(agent: Agent, state_key: str):
    """Factory producing an async graph node that executes one agent."""

    async def node(state: AgentState) -> dict:
        run_id = uuid.UUID(state["run_id"])
        if steps.is_cancelled(run_id):
            raise RunCancelledError(f"Run {run_id} cancelled by user")
        context = agent.build_context(state)
        iteration = int(state.get("iteration") or 1)
        feedback = (state.get("agent_feedback") or {}).get(agent.key, [])
        step_id = await steps.start_step(
            run_id,
            agent.key,
            iteration=iteration,
            input_artifacts=_INPUT_ARTIFACTS.get(agent.key, []),
            feedback=feedback,
        )
        started = time.monotonic()
        model_used = "deterministic"
        token_usage: int | None = None
        logger.info(
            "Executing Agent: {agent} (iteration {iteration})",
            agent=agent.name,
            iteration=iteration,
        )
        try:
            if state.get("mode") == "llm" and _llm.is_available():
                try:
                    output, token_usage = _llm.generate(agent, context)
                    model_used = _llm.model_name or "llm"
                except Exception as exc:  # noqa: BLE001 - a failing provider must not
                    # sink the run; degrade to the deterministic engine for this node.
                    logger.warning(
                        "LLM provider failed for {agent}; falling back to the "
                        "deterministic engine: {error}",
                        agent=agent.key,
                        error=exc,
                    )
                    output = agent.run_deterministic(context)
                    model_used = "deterministic (llm fallback)"
            else:
                output = agent.run_deterministic(context)
            validated = agent.output_schema.model_validate(output).model_dump()
        except Exception as exc:  # noqa: BLE001 - any failure must surface on the step
            logger.error("Agent {agent} failed: {error}", agent=agent.key, error=exc)
            await steps.fail_step(run_id, step_id, agent=agent.key, error=str(exc))
            raise
        duration = time.monotonic() - started
        await steps.complete_step(
            run_id,
            step_id,
            agent=agent.key,
            output=validated,
            duration_seconds=duration,
            state_key=state_key,
            model_used=model_used,
            token_usage=token_usage,
            feedback=feedback,
            iteration=iteration,
        )
        logger.info(
            "Agent {agent} completed ({duration:.1f}s, {model})",
            agent=agent.name,
            duration=duration,
            model=model_used,
        )
        update: dict = {
            state_key: validated,
            "conversation_history": [f"{agent.name}: completed"],
        }
        if agent.key == "reviewer":
            update["review_count"] = int(state.get("review_count", 0)) + 1
            update["revision_feedback"] = validated.get("feedback", [])
            update["agent_feedback"] = validated.get("feedback_by_agent", {})
            update["feedback_history"] = (state.get("feedback_history") or []) + [
                {
                    "iteration": iteration,
                    "status": validated.get("status") or validated.get("verdict"),
                    "overall_score": validated.get("overall_score"),
                    "target_agent": validated.get("target_agent"),
                    "feedback": validated.get("feedback", []),
                }
            ]
            # Each revision cycle advances the iteration so re-run steps record
            # the cycle that produced them.
            update["iteration"] = iteration + (0 if validated.get("approved") else 1)
            if not validated.get("approved") and validated.get("target_agent"):
                await steps.mark_needs_revision(
                    run_id, validated["target_agent"], validated.get("feedback", [])
                )
        return update

    return node


def _route_start(state: AgentState) -> str:
    """Fresh runs start at product_manager; retries resume at the failed agent."""
    resume = state.get("resume_from")
    if resume in _AGENT_KEYS:
        return resume
    return "product_manager"


def _route_after_review(state: AgentState) -> str:
    """Approve and finish, or route the feedback to the responsible agent."""
    review = state.get("review") or {}
    if review.get("approved"):
        return "approved"
    # Hard bound on the reflection loop so the pipeline always terminates.
    if int(state.get("review_count", 0)) >= MAX_REVIEW_CYCLES:
        return "approved"
    target = review.get("target_agent") or "solution_architect"
    return target if target in _AGENT_KEYS else "solution_architect"


def build_agent_graph():
    """Build (and cache) the compiled workflow graph."""
    global _graph
    if _graph is not None:
        return _graph

    builder = StateGraph(AgentState)

    for agent in AGENT_CATALOG:
        builder.add_node(agent.key, _node_for(agent, _STATE_KEY[agent.key]))

    node_paths = {key: key for key in _AGENT_KEYS}
    builder.add_conditional_edges(START, _route_start, node_paths)

    # Strict linear dependency chain — each agent consumes its predecessors.
    builder.add_edge("product_manager", "solution_architect")
    builder.add_edge("solution_architect", "database_architect")
    builder.add_edge("database_architect", "backend_engineer")
    builder.add_edge("backend_engineer", "frontend_engineer")
    builder.add_edge("frontend_engineer", "qa_engineer")
    builder.add_edge("qa_engineer", "security_auditor")
    builder.add_edge("security_auditor", "devops_engineer")
    builder.add_edge("devops_engineer", "technical_writer")
    builder.add_edge("technical_writer", "reviewer")

    # Reviewer → quality gate: approved ends the run; otherwise the feedback
    # goes to the responsible agent and its downstream dependents re-run.
    builder.add_conditional_edges(
        "reviewer",
        _route_after_review,
        {**node_paths, "approved": END},
    )

    _graph = builder.compile()
    return _graph


def state_key_for(agent_key: str) -> str:
    """Public accessor so the retry service can rebuild state from steps."""
    return _STATE_KEY[agent_key]


def get_llm() -> LlmClient:
    return _llm
