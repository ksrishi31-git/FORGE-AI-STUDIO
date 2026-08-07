"""Agent catalog — the ten departments of the AI software company (MAD §2)."""

from __future__ import annotations

from app.agents import deterministic as det
from app.agents.base import Agent
from app.agents.schemas import (
    ArchitectInput,
    ArchitectureOutput,
    BackendOutput,
    DatabaseInput,
    DatabaseSchemaOutput,
    DeploymentPlanOutput,
    DocumentationOutput,
    EngineerInput,
    FrontendOutput,
    ProductManagerInput,
    ProductRequirementsOutput,
    QaInput,
    QaReportOutput,
    ReviewerInput,
    ReviewOutput,
    SecurityInput,
    SecurityReportOutput,
    WriterInput,
)


def _feedback_for(state: dict, agent_key: str) -> list[str]:
    """The Reviewer feedback routed to one agent for the current cycle."""
    return (state.get("agent_feedback") or {}).get(agent_key, [])


def _product_context(state: dict) -> dict:
    return {
        "project_name": state.get("project_name", "Untitled Project"),
        "requirements": state.get("requirements", ""),
        "preferred_stack": state.get("preferred_stack", []),
        "project_memory": state.get("project_memory", {}),
        "revision_feedback": _feedback_for(state, "product_manager"),
    }


def _architect_context(state: dict) -> dict:
    return {
        "product_requirements": state.get("product_requirements", {}),
        "requirements": state.get("requirements", ""),
        "preferred_stack": state.get("preferred_stack", []),
        "revision_feedback": _feedback_for(state, "solution_architect"),
    }


def _engineer_context(state: dict, agent_key: str) -> dict:
    return {
        "architecture": state.get("architecture", {}),
        "product_requirements": state.get("product_requirements", {}),
        "database_schema": state.get("database_schema", {}),
        "preferred_stack": state.get("preferred_stack", []),
        "requirements": state.get("requirements", ""),
        "revision_feedback": _feedback_for(state, agent_key),
    }


def _database_context(state: dict) -> dict:
    return {
        "architecture": state.get("architecture", {}),
        "product_requirements": state.get("product_requirements", {}),
        "preferred_stack": state.get("preferred_stack", []),
        "requirements": state.get("requirements", ""),
        "revision_feedback": _feedback_for(state, "database_architect"),
    }


def _qa_context(state: dict) -> dict:
    return {
        "product_requirements": state.get("product_requirements", {}),
        "backend_output": state.get("backend_output", {}),
        "frontend_output": state.get("frontend_output", {}),
        "database_schema": state.get("database_schema", {}),
        "requirements": state.get("requirements", ""),
        "revision_feedback": _feedback_for(state, "qa_engineer"),
    }


def _security_context(state: dict) -> dict:
    return {
        "architecture": state.get("architecture", {}),
        "backend_output": state.get("backend_output", {}),
        "database_schema": state.get("database_schema", {}),
        "requirements": state.get("requirements", ""),
        "revision_feedback": _feedback_for(state, "security_auditor"),
    }


def _devops_context(state: dict) -> dict:
    return {
        "architecture": state.get("architecture", {}),
        "product_requirements": state.get("product_requirements", {}),
        "backend_output": state.get("backend_output", {}),
        "preferred_stack": state.get("preferred_stack", []),
        "requirements": state.get("requirements", ""),
        "revision_feedback": _feedback_for(state, "devops_engineer"),
    }


def _writer_context(state: dict) -> dict:
    return {
        "project_name": state.get("project_name", "Untitled Project"),
        "product_requirements": state.get("product_requirements", {}),
        "architecture": state.get("architecture", {}),
        "backend_output": state.get("backend_output", {}),
        "frontend_output": state.get("frontend_output", {}),
        "database_schema": state.get("database_schema", {}),
        "deployment_plan": state.get("deployment_plan", {}),
        "requirements": state.get("requirements", ""),
        "revision_feedback": _feedback_for(state, "technical_writer"),
    }


def _reviewer_context(state: dict) -> dict:
    return {
        "requirements": state.get("requirements", ""),
        "product_requirements": state.get("product_requirements", {}),
        "architecture": state.get("architecture", {}),
        "backend_output": state.get("backend_output", {}),
        "frontend_output": state.get("frontend_output", {}),
        "database_schema": state.get("database_schema", {}),
        "qa_report": state.get("qa_report", {}),
        "security_report": state.get("security_report", {}),
        "deployment_plan": state.get("deployment_plan", {}),
        "documentation": state.get("documentation", {}),
        "review_count": state.get("review_count", 0),
        "preferred_stack": state.get("preferred_stack", []),
    }


AGENT_CATALOG: list[Agent] = [
    Agent(
        key="product_manager",
        name="Product Manager",
        role="Requirements and scope",
        description="Turns plain-English requirements into a structured product brief.",
        order=1,
        system_prompt=(
            "You are the Product Manager of an autonomous software company. "
            "Analyze the business requirements, resolve ambiguities, and produce a "
            "structured product brief: overview, user stories, feature list, "
            "non-functional requirements, and acceptance criteria. Be precise and "
            "business-focused."
        ),
        input_schema=ProductManagerInput,
        output_schema=ProductRequirementsOutput,
        context_builder=_product_context,
        deterministic_fn=det.run_product_manager,
    ),
    Agent(
        key="solution_architect",
        name="Solution Architect",
        role="System design",
        description="Designs the component architecture and data flow.",
        order=2,
        system_prompt=(
            "You are the Solution Architect of an autonomous software company. "
            "Design a production-grade system architecture from the product brief: "
            "components, data flow, technology decisions, and risks. Prefer the "
            "declared preferred stack. If revision feedback is present, address it "
            "explicitly."
        ),
        input_schema=ArchitectInput,
        output_schema=ArchitectureOutput,
        context_builder=_architect_context,
        deterministic_fn=det.run_architect,
    ),
    Agent(
        key="database_architect",
        name="Database Architect",
        role="Data modeling",
        description="Designs the schema and relationships for the chosen database.",
        order=3,
        system_prompt=(
            "You are the Database Architect of an autonomous software company. "
            "Produce a normalized schema for the preferred database from the "
            "product brief and architecture: tables, columns, keys, indexes, and "
            "migration notes. Stay consistent with the declared stack."
        ),
        input_schema=DatabaseInput,
        output_schema=DatabaseSchemaOutput,
        context_builder=_database_context,
        deterministic_fn=det.run_database,
    ),
    Agent(
        key="backend_engineer",
        name="Backend Engineer",
        role="API and services",
        description="Implements the API design, module map, and service layer.",
        order=4,
        system_prompt=(
            "You are the Backend Engineer of an autonomous software company. "
            "Derive a complete backend design from the architecture and database "
            "schema: folder structure, modules, REST endpoints, authentication, "
            "validation, error handling, integrations, and representative code. "
            "Follow clean architecture, enterprise conventions, and the preferred "
            "stack. If revision feedback is present, address it explicitly."
        ),
        input_schema=EngineerInput,
        output_schema=BackendOutput,
        context_builder=lambda state: _engineer_context(state, "backend_engineer"),
        deterministic_fn=det.run_backend,
    ),
    Agent(
        key="frontend_engineer",
        name="Frontend Engineer",
        role="Interface and UX",
        description="Designs the application pages, components, and data layer.",
        order=5,
        system_prompt=(
            "You are the Frontend Engineer of an autonomous software company. "
            "Design the user-facing application from the architecture and product "
            "brief: page map, component library, user flows, state management, "
            "and typed data layer. Prefer the declared frontend stack. If revision "
            "feedback is present, address it explicitly."
        ),
        input_schema=EngineerInput,
        output_schema=FrontendOutput,
        context_builder=lambda state: _engineer_context(state, "frontend_engineer"),
        deterministic_fn=det.run_frontend,
    ),
    Agent(
        key="qa_engineer",
        name="QA Engineer",
        role="Verification",
        description="Derives a tiered test plan from the user stories and artifacts.",
        order=6,
        system_prompt=(
            "You are the QA Engineer of an autonomous software company. "
            "Produce a test plan: test cases derived from user stories, a coverage "
            "matrix, and residual risks. Cover happy paths and error handling."
        ),
        input_schema=QaInput,
        output_schema=QaReportOutput,
        context_builder=_qa_context,
        deterministic_fn=det.run_qa,
    ),
    Agent(
        key="security_auditor",
        name="Security Auditor",
        role="Threat assessment",
        description="Audits the design for security risks and controls.",
        order=7,
        system_prompt=(
            "You are the Security Auditor of an autonomous software company. "
            "Assess the architecture, API, and schema for security risk: authn/authz, "
            "input validation, secrets handling, and dependency hygiene. Report "
            "severity-ranked findings and a checklist."
        ),
        input_schema=SecurityInput,
        output_schema=SecurityReportOutput,
        context_builder=_security_context,
        deterministic_fn=det.run_security,
    ),
    Agent(
        key="devops_engineer",
        name="DevOps Engineer",
        role="Delivery",
        description="Designs the deployment plan and CI/CD pipeline.",
        order=8,
        system_prompt=(
            "You are the DevOps Engineer of an autonomous software company. "
            "Produce a deployment plan: services, container images, environment "
            "variables, CI/CD steps, and a rollback strategy."
        ),
        input_schema=EngineerInput,
        output_schema=DeploymentPlanOutput,
        context_builder=_devops_context,
        deterministic_fn=det.run_devops,
    ),
    Agent(
        key="technical_writer",
        name="Technical Writer",
        role="Documentation",
        description="Assembles README, quickstart, and API reference.",
        order=9,
        system_prompt=(
            "You are the Technical Writer of an autonomous software company. "
            "Assemble user and developer documentation from the completed "
            "artifacts: README, quickstart, API reference, and deployment guide."
        ),
        input_schema=WriterInput,
        output_schema=DocumentationOutput,
        context_builder=_writer_context,
        deterministic_fn=det.run_writer,
    ),
    Agent(
        key="reviewer",
        name="Reviewer",
        role="Quality gate",
        description="Scores the artifact set, checks consistency, and routes feedback.",
        order=10,
        system_prompt=(
            "You are the Reviewer of an autonomous software company. Evaluate the "
            "complete artifact set against the source requirements across ten "
            "dimensions, assign each a 0-100 score, compute an overall score, and "
            "return a verdict. Use these thresholds: 90+ APPROVED, 75-89 "
            "NEEDS_REVISION, below 75 REJECTED. A critical security finding must "
            "override the score and reject the run. Check cross-artifact "
            "consistency (database vs backend stack, frontend endpoints vs backend "
            "contract, security auth vs backend implementation). When not approved, "
            "set target_agent to the responsible agent and fill feedback_by_agent "
            "with specific, actionable issues."
        ),
        input_schema=ReviewerInput,
        output_schema=ReviewOutput,
        context_builder=_reviewer_context,
        deterministic_fn=det.run_reviewer,
    ),
]

_AGENT_BY_KEY = {agent.key: agent for agent in AGENT_CATALOG}


def get_agent(key: str) -> Agent:
    return _AGENT_BY_KEY[key]
