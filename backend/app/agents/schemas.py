"""Per-agent input and output schemas (MAD §2 — I/O contracts).

Every output schema carries a `markdown` field so the frontend can render the
artifact directly; the structured fields keep the data machine-readable for
downstream agents and the Reviewer.

Phase 4.0 enriches each artifact with the documented structure (functional
requirements, components/services, auth/validation sections, test tiers,
security posture, deployment details) and gives the Reviewer a scored,
threshold-based verdict with targeted feedback routing.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# --- Inputs ----------------------------------------------------------------------


class ProductManagerInput(BaseModel):
    project_name: str
    requirements: str
    preferred_stack: list[str] = Field(default_factory=list)
    project_memory: dict[str, str] = Field(default_factory=dict)
    revision_feedback: list[str] = Field(default_factory=list)


class ArchitectInput(BaseModel):
    product_requirements: dict
    requirements: str
    preferred_stack: list[str] = Field(default_factory=list)
    revision_feedback: list[str] = Field(default_factory=list)


class EngineerInput(BaseModel):
    architecture: dict
    product_requirements: dict
    preferred_stack: list[str] = Field(default_factory=list)
    requirements: str = ""
    revision_feedback: list[str] = Field(default_factory=list)


class DatabaseInput(BaseModel):
    architecture: dict
    product_requirements: dict
    preferred_stack: list[str] = Field(default_factory=list)
    requirements: str = ""
    revision_feedback: list[str] = Field(default_factory=list)


class QaInput(BaseModel):
    product_requirements: dict
    backend_output: dict
    frontend_output: dict
    database_schema: dict
    requirements: str = ""
    revision_feedback: list[str] = Field(default_factory=list)


class SecurityInput(BaseModel):
    architecture: dict
    backend_output: dict
    database_schema: dict
    requirements: str = ""
    revision_feedback: list[str] = Field(default_factory=list)


class DevopsInput(BaseModel):
    architecture: dict
    backend_output: dict
    preferred_stack: list[str] = Field(default_factory=list)
    requirements: str = ""
    revision_feedback: list[str] = Field(default_factory=list)


class WriterInput(BaseModel):
    product_requirements: dict
    architecture: dict
    backend_output: dict
    frontend_output: dict
    database_schema: dict
    deployment_plan: dict
    project_name: str
    requirements: str = ""
    revision_feedback: list[str] = Field(default_factory=list)


class ReviewerInput(BaseModel):
    requirements: str
    product_requirements: dict
    architecture: dict
    backend_output: dict
    frontend_output: dict
    database_schema: dict
    qa_report: dict
    security_report: dict
    deployment_plan: dict
    documentation: dict
    review_count: int = 0


# --- Outputs ---------------------------------------------------------------------


class ProductRequirementsOutput(BaseModel):
    product_name: str
    overview: str
    user_stories: list[str] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    functional_requirements: list[str] = Field(default_factory=list)
    non_functional_requirements: list[str] = Field(default_factory=list)
    user_roles: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    markdown: str


class ComponentSpec(BaseModel):
    name: str
    responsibility: str


class ServiceSpec(BaseModel):
    name: str
    purpose: str
    technology: str = ""


class ArchitectureOutput(BaseModel):
    architecture_overview: str
    components: list[ComponentSpec] = Field(default_factory=list)
    services: list[ServiceSpec] = Field(default_factory=list)
    data_flow: list[str] = Field(default_factory=list)
    technology_decisions: list[str] = Field(default_factory=list)
    security_considerations: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    mermaid: str = ""
    markdown: str


class CodeSnippet(BaseModel):
    file: str
    language: str
    content: str


class BackendOutput(BaseModel):
    folder_structure: list[str] = Field(default_factory=list)
    key_modules: list[str] = Field(default_factory=list)
    api_endpoints: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    authentication: list[str] = Field(default_factory=list)
    authorization: list[str] = Field(default_factory=list)
    validation: list[str] = Field(default_factory=list)
    error_handling: list[str] = Field(default_factory=list)
    integrations: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    code_snippets: list[CodeSnippet] = Field(default_factory=list)
    markdown: str


class FrontendOutput(BaseModel):
    app_structure: list[str] = Field(default_factory=list)
    pages: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    user_flows: list[str] = Field(default_factory=list)
    state_management: list[str] = Field(default_factory=list)
    api_integration: list[str] = Field(default_factory=list)
    accessibility: list[str] = Field(default_factory=list)
    data_layer: list[str] = Field(default_factory=list)
    markdown: str


class TableColumn(BaseModel):
    name: str
    type: str
    constraints: str = ""


class TableSpec(BaseModel):
    name: str
    purpose: str
    columns: list[TableColumn] = Field(default_factory=list)
    primary_key: str = "id"
    foreign_keys: list[str] = Field(default_factory=list)
    indexes: list[str] = Field(default_factory=list)


class DatabaseSchemaOutput(BaseModel):
    tables: list[TableSpec] = Field(default_factory=list)
    relationships: list[str] = Field(default_factory=list)
    migration_notes: list[str] = Field(default_factory=list)
    markdown: str


class TestCase(BaseModel):
    id: str
    title: str
    steps: list[str] = Field(default_factory=list)
    expected: str


class QaReportOutput(BaseModel):
    summary: str
    test_cases: list[TestCase] = Field(default_factory=list)
    unit_tests: list[str] = Field(default_factory=list)
    integration_tests: list[str] = Field(default_factory=list)
    edge_cases: list[str] = Field(default_factory=list)
    acceptance_tests: list[str] = Field(default_factory=list)
    test_matrix: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    markdown: str


class SecurityFinding(BaseModel):
    severity: str
    title: str
    recommendation: str


class SecurityReportOutput(BaseModel):
    summary: str
    risk_level: str = "medium"
    threats: list[str] = Field(default_factory=list)
    vulnerabilities: list[str] = Field(default_factory=list)
    mitigations: list[str] = Field(default_factory=list)
    findings: list[SecurityFinding] = Field(default_factory=list)
    checklist: list[str] = Field(default_factory=list)
    security_recommendations: list[str] = Field(default_factory=list)
    markdown: str


class DeploymentService(BaseModel):
    name: str
    image: str
    port: str


class DeploymentPlanOutput(BaseModel):
    overview: str
    environment: list[str] = Field(default_factory=list)
    services: list[DeploymentService] = Field(default_factory=list)
    docker: list[str] = Field(default_factory=list)
    ci_cd_steps: list[str] = Field(default_factory=list)
    infrastructure: list[str] = Field(default_factory=list)
    monitoring: list[str] = Field(default_factory=list)
    deployment_steps: list[str] = Field(default_factory=list)
    environment_variables: list[str] = Field(default_factory=list)
    rollback: list[str] = Field(default_factory=list)
    markdown: str


class DocumentationOutput(BaseModel):
    overview: str
    setup: list[str] = Field(default_factory=list)
    architecture: str = ""
    api_documentation: list[str] = Field(default_factory=list)
    development: list[str] = Field(default_factory=list)
    deployment: list[str] = Field(default_factory=list)
    readme: str
    quickstart: list[str] = Field(default_factory=list)
    api_reference: list[str] = Field(default_factory=list)
    deployment_guide: list[str] = Field(default_factory=list)
    markdown: str


class ReviewOutput(BaseModel):
    approved: bool
    verdict: str  # "APPROVED" | "NEEDS_REVISION" | "REJECTED"
    status: str = ""  # alias of verdict for readability
    overall_score: int = 0
    scores: dict[str, int] = Field(default_factory=dict)
    strengths: list[str] = Field(default_factory=list)
    findings: list[str] = Field(default_factory=list)
    consistency_issues: list[str] = Field(default_factory=list)
    feedback: list[str] = Field(default_factory=list)
    feedback_by_agent: dict[str, list[str]] = Field(default_factory=dict)
    target_agent: str | None = None
    next_action: str  # "proceed" | "revise"
    markdown: str
