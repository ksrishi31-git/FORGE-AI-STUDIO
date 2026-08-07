"""Multi-agent engine package (Phase 3.5).

Each specialist agent is a reusable `Agent` definition (system prompt plus
input/output schemas). The LangGraph workflow in `graph.py` orchestrates them
through the shared `AgentState`.
"""

from app.agents.definitions import AGENT_CATALOG, get_agent
from app.agents.graph import build_agent_graph

__all__ = ["AGENT_CATALOG", "build_agent_graph", "get_agent"]
