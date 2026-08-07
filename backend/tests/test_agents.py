"""Multi-agent engine contract tests (Phase 3.5)."""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import app.agents.deterministic as det
import app.agents.graph as graph_module
from app.database.session import get_session_factory
from app.models.agent import AgentRun, AgentStep, ProjectContext
from app.services import agent_service
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update

PASSWORD = "Enterprise-Pass-123"

REQUIREMENTS = (
    "Build a customer portal where clients can view invoices, track payments, "
    "and download receipts. Accountants can reconcile monthly statements and "
    "export reports. The system must send payment reminders automatically."
)


def _email(label: str) -> str:
    return f"{label}-{uuid.uuid4().hex[:8]}@example.com"


def _register(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": _email("agent"), "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _developer(client: TestClient) -> dict:
    """Every registered user is a developer (no viewer tier)."""
    return _register(client)


def _start_run(client: TestClient, token: str, **overrides) -> dict:
    response = client.post(
        "/api/v1/agents/run",
        json={"requirements": REQUIREMENTS, **overrides},
        headers=_auth_headers(token),
    )
    assert response.status_code == 202
    return response.json()


async def _step_agents(run_id: uuid.UUID) -> list[str]:
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(select(AgentStep.agent).where(AgentStep.run_id == run_id))
        return list(result.scalars().all())


# --- RBAC --------------------------------------------------------------------------


def test_run_requires_auth(client: TestClient) -> None:
    response = client.post("/api/v1/agents/run", json={"requirements": REQUIREMENTS})
    assert response.status_code == 401


def test_registered_user_can_start_run(client: TestClient) -> None:
    """A freshly registered user can start agent runs immediately."""
    registered = _register(client)
    response = client.post(
        "/api/v1/agents/run",
        json={"requirements": REQUIREMENTS},
        headers=_auth_headers(registered["access_token"]),
    )
    assert response.status_code == 202


def test_run_validates_mode(client: TestClient) -> None:
    developer = _developer(client)
    response = client.post(
        "/api/v1/agents/run",
        json={"requirements": REQUIREMENTS, "mode": "quantum"},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 422


def test_llm_mode_requires_provider(client: TestClient) -> None:
    developer = _developer(client)
    response = client.post(
        "/api/v1/agents/run",
        json={"requirements": REQUIREMENTS, "mode": "llm"},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PROVIDER_UNAVAILABLE"


# --- Lifecycle ---------------------------------------------------------------------


def test_run_resolves_deterministic_without_key(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    assert accepted["status"] == "queued"
    assert accepted["mode"] == "deterministic"

    status = client.get(
        f"/api/v1/agents/status/{accepted['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    assert status.status_code == 200
    assert status.json()["status"] in ("queued", "running")


def test_cancel_run_marks_queued_run_cancelled(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    run_id = uuid.UUID(accepted["run_id"])

    cancelled = client.post(
        f"/api/v1/agents/cancel/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    # The executor must stop at the next node boundary and never clobber the
    # cancellation with a completion or failure write.
    asyncio.run(agent_service.execute_run(run_id))
    status = client.get(
        f"/api/v1/agents/status/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    body = status.json()
    assert body["status"] == "cancelled"
    assert body["error"] is None


def test_cancel_run_is_idempotent_and_scoped(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    run_id = uuid.UUID(accepted["run_id"])

    asyncio.run(agent_service.execute_run(run_id))
    # Cancelling a terminal run is a no-op that returns the current state.
    cancelled = client.post(
        f"/api/v1/agents/cancel/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "completed"

    # The endpoint is ownership-scoped like every other run operation.
    other = _developer(client)
    hidden = client.post(
        f"/api/v1/agents/cancel/{run_id}", headers=_auth_headers(other["access_token"])
    )
    assert hidden.status_code == 404


def test_definitions_endpoint(client: TestClient) -> None:
    developer = _developer(client)
    response = client.get(
        "/api/v1/agents/definitions", headers=_auth_headers(developer["access_token"])
    )
    assert response.status_code == 200
    names = [definition["name"] for definition in response.json()]
    assert "Product Manager" in names
    assert "Reviewer" in names
    assert len(response.json()) == 10


def test_pipeline_executes_all_agents(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    run_id = uuid.UUID(accepted["run_id"])

    asyncio.run(agent_service.execute_run(run_id))

    status = client.get(
        f"/api/v1/agents/status/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    body = status.json()
    assert body["status"] == "completed"
    assert body["progress"] == 100
    assert body["completed_steps"] >= 10
    assert body["error"] is None

    output = client.get(
        f"/api/v1/agents/output/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert output.status_code == 200
    steps = output.json()["steps"]
    agents = [step["agent"] for step in steps]
    for expected in (
        "product_manager",
        "solution_architect",
        "backend_engineer",
        "frontend_engineer",
        "database_architect",
        "qa_engineer",
        "security_auditor",
        "devops_engineer",
        "technical_writer",
        "reviewer",
    ):
        assert expected in agents

    for step in steps:
        assert step["status"] == "completed"
        assert step["output"] is not None
        assert step["output"]["markdown"]
        assert step["duration_ms"] is not None


def test_review_approves_complete_artifact_set(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    output = client.get(
        f"/api/v1/agents/output/{accepted['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    steps = output.json()["steps"]
    review = next(step for step in steps if step["agent"] == "reviewer")
    assert review["output"]["approved"] is True
    assert review["output"]["verdict"] == "APPROVED"


def test_review_loop_bounded_when_requirements_insufficient(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"], requirements="x")
    run_id = uuid.UUID(accepted["run_id"])

    asyncio.run(agent_service.execute_run(run_id))

    steps = asyncio.run(_step_agents(run_id))
    reviewer_runs = steps.count("reviewer")
    assert reviewer_runs >= 2

    status = client.get(
        f"/api/v1/agents/status/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert status.json()["status"] == "completed"


# --- Phase 4.0: reviewer quality gate ----------------------------------------------


def _full_review_context(**overrides) -> dict:
    """A complete, high-quality artifact set for direct reviewer unit tests."""
    product = det.run_product_manager(
        {
            "project_name": "Portal",
            "requirements": (
                "Build a customer portal where clients can view invoices, track payments, "
                "and download receipts. Accountants can reconcile monthly statements."
            ),
            "preferred_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
        }
    )
    arch = det.run_architect(
        {
            "product_requirements": product,
            "requirements": "A customer portal with invoices and payments",
            "preferred_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
        }
    )
    database = det.run_database(
        {"architecture": arch, "product_requirements": product, "preferred_stack": ["PostgreSQL"]}
    )
    backend = det.run_backend(
        {
            "architecture": arch,
            "product_requirements": product,
            "database_schema": database,
            "preferred_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
        }
    )
    frontend = det.run_frontend(
        {
            "architecture": arch,
            "product_requirements": product,
            "database_schema": database,
            "preferred_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
        }
    )
    qa = det.run_qa(
        {
            "product_requirements": product,
            "backend_output": backend,
            "frontend_output": frontend,
            "database_schema": database,
        }
    )
    security = det.run_security(
        {
            "architecture": arch,
            "backend_output": backend,
            "database_schema": database,
            "requirements": "A customer portal with invoices and payments",
        }
    )
    devops = det.run_devops(
        {
            "architecture": arch,
            "backend_output": backend,
            "product_requirements": product,
            "preferred_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
        }
    )
    docs = det.run_writer(
        {
            "project_name": "Portal",
            "product_requirements": product,
            "architecture": arch,
            "backend_output": backend,
            "frontend_output": frontend,
            "database_schema": database,
            "deployment_plan": devops,
        }
    )
    return {
        "requirements": "A customer portal where clients view invoices and track payments.",
        "product_requirements": product,
        "architecture": arch,
        "backend_output": backend,
        "frontend_output": frontend,
        "database_schema": database,
        "qa_report": qa,
        "security_report": security,
        "deployment_plan": devops,
        "documentation": docs,
        "review_count": 0,
        "preferred_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
        **overrides,
    }


def test_reviewer_scores_all_dimensions_and_approves() -> None:
    review = det.run_reviewer(_full_review_context())
    assert review["overall_score"] >= 90
    assert review["status"] == "APPROVED"
    assert review["verdict"] == "APPROVED"
    assert review["approved"] is True
    assert review["target_agent"] is None
    for dimension in (
        "requirement_coverage",
        "architecture_quality",
        "backend_quality",
        "frontend_quality",
        "database_quality",
        "qa_coverage",
        "security_score",
        "deployment_readiness",
        "documentation_quality",
        "consistency_score",
    ):
        assert dimension in review["scores"]
        assert 0 <= review["scores"][dimension] <= 100


def test_reviewer_returns_needs_revision_for_weak_artifacts() -> None:
    context = _full_review_context()
    # Strip the backend contract: overall drops below the approval threshold.
    context["backend_output"] = {
        "api_endpoints": [],
        "authentication": [],
        "validation": [],
        "error_handling": [],
        "integrations": [],
        "dependencies": [],
    }
    review = det.run_reviewer(context)
    assert review["status"] in ("NEEDS_REVISION", "REJECTED")
    assert review["approved"] is False
    assert review["target_agent"] == "backend_engineer"
    assert "backend_engineer" in review["feedback_by_agent"]


def test_reviewer_security_override_rejects_high_scoring_run() -> None:
    context = _full_review_context()
    context["security_report"] = {
        **context["security_report"],
        "risk_level": "high",
        "findings": [
            {"severity": "high", "title": "Authentication coverage", "recommendation": "x"}
        ],
    }
    review = det.run_reviewer(context)
    assert review["status"] == "REJECTED"
    assert review["approved"] is False
    assert any("security" in finding.lower() for finding in review["findings"])


def test_reviewer_reports_consistency_issues() -> None:
    context = _full_review_context()
    # Backend switches to MongoDB while the database plan stays PostgreSQL.
    context["backend_output"] = {
        **context["backend_output"],
        "dependencies": ["FastAPI", "MongoDB"],
        "authentication": [],
    }
    context["security_report"] = {
        **context["security_report"],
        "findings": [
            {
                "severity": "high",
                "title": "JWT authentication required",
                "recommendation": "x",
            }
        ],
        "risk_level": "high",
    }
    review = det.run_reviewer(context)
    assert review["consistency_issues"], "expected consistency issues to be flagged"


def test_pipeline_artifacts_are_structured(client: TestClient) -> None:
    """Every step output carries the Phase 4.0 structured artifact fields."""
    developer = _developer(client)
    accepted = _start_run(
        client,
        developer["access_token"],
        requirements=(
            "Build an AI support assistant with login, chat, email notifications, "
            "and file uploads. Agents route conversations and the system caches "
            "responses with Redis for performance."
        ),
        preferred_stack=["React", "Next.js", "TypeScript", "FastAPI", "PostgreSQL", "Redis"],
    )
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    output = client.get(
        f"/api/v1/agents/output/{accepted['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    steps = output.json()["steps"]
    by_agent = {step["agent"]: step for step in steps}

    product = by_agent["product_manager"]["output"]
    assert product["functional_requirements"]
    assert product["user_roles"]
    assert product["constraints"]

    architecture = by_agent["solution_architect"]["output"]
    assert architecture["services"]
    assert architecture["security_considerations"]
    # Project-specific: an AI product gets an AI/LLM layer in the diagram.
    assert any("AI" in str(component["name"]) for component in architecture["components"])
    assert "flowchart TD" in architecture["mermaid"]
    assert "LLM" in architecture["mermaid"]

    backend = by_agent["backend_engineer"]["output"]
    assert backend["authentication"]
    assert backend["authorization"]
    assert backend["validation"]
    assert backend["error_handling"]
    assert backend["integrations"]

    frontend = by_agent["frontend_engineer"]["output"]
    assert frontend["user_flows"]
    assert frontend["state_management"]
    assert frontend["api_integration"]
    assert frontend["accessibility"]

    qa = by_agent["qa_engineer"]["output"]
    assert qa["unit_tests"]
    assert qa["integration_tests"]
    assert qa["edge_cases"]
    assert qa["acceptance_tests"]

    security = by_agent["security_auditor"]["output"]
    assert security["risk_level"]
    assert security["threats"]
    assert security["vulnerabilities"]
    assert security["mitigations"]
    assert security["security_recommendations"]

    deployment = by_agent["devops_engineer"]["output"]
    assert deployment["environment"]
    assert deployment["docker"]
    assert deployment["infrastructure"]
    assert deployment["monitoring"]
    assert deployment["deployment_steps"]

    docs = by_agent["technical_writer"]["output"]
    assert docs["overview"]
    assert docs["setup"]
    assert docs["architecture"]
    assert docs["api_documentation"]
    assert docs["development"]

    review = by_agent["reviewer"]["output"]
    assert review["overall_score"] > 0
    assert review["scores"]

    # Every step records real execution metadata.
    for step in steps:
        assert step["iteration"] >= 1
        assert step["model_used"]
        assert step["input_artifacts"] is not None


def test_preferred_stack_drives_artifacts(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(
        client,
        developer["access_token"],
        requirements="Build an e-commerce storefront with product listings and checkout.",
        preferred_stack=["Next.js", "Express", "MongoDB", "Docker"],
    )
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    output = client.get(
        f"/api/v1/agents/output/{accepted['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    by_agent = {step["agent"]: step for step in output.json()["steps"]}
    backend = by_agent["backend_engineer"]["output"]
    database = by_agent["database_architect"]["output"]
    deployment = by_agent["devops_engineer"]["output"]

    assert any("Express" in item for item in backend["dependencies"])
    assert "MongoDB" in " ".join(database["migration_notes"])
    images = " ".join(str(service.get("image", "")) for service in deployment["services"])
    assert "mongodb" in images.lower() or "mongo" in images.lower()


def test_retry_resumes_from_failed_agent(client: TestClient, monkeypatch) -> None:
    from app.agents.definitions import get_agent

    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    run_id = uuid.UUID(accepted["run_id"])

    calls = {"n": 0}
    backend_agent = get_agent("backend_engineer")
    original = backend_agent.deterministic_fn

    def flaky(ctx: dict) -> dict:
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("simulated backend failure")
        return original(ctx)

    # `Agent` is a frozen dataclass; the catalog holds the function reference,
    # so patch the instance (the graph resolves it at call time).
    object.__setattr__(backend_agent, "deterministic_fn", flaky)
    try:
        asyncio.run(agent_service.execute_run(run_id))
    finally:
        object.__setattr__(backend_agent, "deterministic_fn", original)

    status = client.get(
        f"/api/v1/agents/status/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert status.json()["status"] == "failed"
    assert "simulated" in status.json()["error"]

    # Retry from the failed agent — completed work is preserved, not re-run.
    retried = client.post(
        f"/api/v1/agents/retry/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert retried.status_code == 202
    new_run_id = uuid.UUID(retried.json()["run_id"])
    assert new_run_id != run_id

    asyncio.run(agent_service.execute_run(new_run_id))

    new_status = client.get(
        f"/api/v1/agents/status/{new_run_id}",
        headers=_auth_headers(developer["access_token"]),
    )
    assert new_status.json()["status"] == "completed"

    steps = asyncio.run(_step_agents(new_run_id))
    # Resumed at backend_engineer: the retried run carries the completed
    # upstream steps (never re-run, never lost) and re-executes from the
    # failed agent through the reviewer.
    assert "backend_engineer" in steps
    assert "product_manager" in steps
    assert "solution_architect" in steps
    assert "database_architect" in steps
    assert "reviewer" in steps
    assert steps.count("backend_engineer") == 1


def test_retry_rejects_non_failed_run(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    response = client.post(
        f"/api/v1/agents/retry/{accepted['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 409


def test_project_context_persisted_after_run(client: TestClient) -> None:
    developer = _developer(client)
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Context Project",
            "requirements": "A billing portal",
            "preferred_stack": ["React", "FastAPI"],
        },
        headers=_auth_headers(developer["access_token"]),
    ).json()

    accepted = _start_run(
        client,
        developer["access_token"],
        project_id=project["id"],
        requirements="A billing portal",
    )
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    async def _context() -> ProjectContext | None:
        factory = get_session_factory()
        async with factory() as session:
            return await session.scalar(
                select(ProjectContext).where(ProjectContext.project_id == uuid.UUID(project["id"]))
            )

    row = asyncio.run(_context())
    assert row is not None
    assert row.execution_status == "completed"
    assert row.artifacts
    assert "architecture" in row.artifacts
    assert "review" in row.artifacts

    status = client.get(
        f"/api/v1/agents/status/{accepted['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    body = status.json()
    assert body["verdict"] in ("APPROVED", "NEEDS_REVISION", "REJECTED")
    assert isinstance(body["overall_score"], int)
    assert body["iteration"] >= 1


def test_history_and_delete(client: TestClient) -> None:
    developer = _developer(client)
    first = _start_run(client, developer["access_token"])
    second = _start_run(client, developer["access_token"], requirements="A different product")

    history = client.get("/api/v1/agents/history", headers=_auth_headers(developer["access_token"]))
    assert history.status_code == 200
    body = history.json()
    assert body["total"] == 2
    assert {item["id"] for item in body["items"]} == {first["run_id"], second["run_id"]}

    deleted = client.delete(
        f"/api/v1/agents/history/{first['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    assert deleted.status_code == 204

    after = client.get("/api/v1/agents/history", headers=_auth_headers(developer["access_token"]))
    assert after.json()["total"] == 1

    missing = client.get(
        f"/api/v1/agents/status/{first['run_id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    assert missing.status_code == 404


def test_run_history_scoped_to_owner(client: TestClient) -> None:
    developer = _developer(client)
    _start_run(client, developer["access_token"])

    other = _developer(client)
    history = client.get("/api/v1/agents/history", headers=_auth_headers(other["access_token"]))
    assert history.json()["total"] == 0

    # The other developer cannot read or delete the first user's run.
    first = client.get("/api/v1/agents/history", headers=_auth_headers(developer["access_token"]))
    run_id = first.json()["items"][0]["id"]
    hidden = client.get(
        f"/api/v1/agents/output/{run_id}", headers=_auth_headers(other["access_token"])
    )
    assert hidden.status_code == 404


# --- Resilience --------------------------------------------------------------------


def test_llm_failure_falls_back_to_deterministic(client: TestClient, monkeypatch) -> None:
    class _FailingLlm:
        def is_available(self) -> bool:
            return True

        def generate(self, agent, context):  # noqa: ARG002 - stub signature
            raise ConnectionError("provider unreachable")

    monkeypatch.setattr(graph_module, "_llm", _FailingLlm())
    # The endpoint refuses `mode=llm` without a key; bypass resolve_mode so the
    # graph executes in LLM mode against the failing provider.
    monkeypatch.setattr(agent_service, "resolve_mode", lambda requested, settings: "llm")

    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"], mode="llm")
    run_id = uuid.UUID(accepted["run_id"])

    asyncio.run(agent_service.execute_run(run_id))

    output = client.get(
        f"/api/v1/agents/output/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    assert output.status_code == 200
    steps = output.json()["steps"]
    assert len(steps) == 10
    for step in steps:
        assert step["status"] == "completed"
        assert step["output"]["markdown"]


def test_total_steps_recomputed_after_review_loops(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"], requirements="x")
    run_id = uuid.UUID(accepted["run_id"])

    asyncio.run(agent_service.execute_run(run_id))

    async def _inspect() -> tuple[int, int, str]:
        factory = get_session_factory()
        async with factory() as session:
            run = await session.get(AgentRun, run_id)
            count = await session.scalar(
                select(func.count()).select_from(AgentStep).where(AgentStep.run_id == run_id)
            )
            return run.total_steps, int(count or 0), run.status

    total_steps, step_count, status = asyncio.run(_inspect())
    assert status == "completed"
    assert step_count > 10  # the reflection loop appends extra step rows
    assert total_steps == step_count


def test_reconcile_marks_stale_runs_failed(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    run_id = uuid.UUID(accepted["run_id"])

    async def _stale() -> None:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(
                update(AgentRun)
                .where(AgentRun.id == run_id)
                .values(
                    status="running",
                    updated_at=datetime.now(UTC) - timedelta(hours=1),
                )
            )
            await session.commit()

    asyncio.run(_stale())

    reconciled = asyncio.run(agent_service.reconcile_stale_runs(grace_seconds=300))
    assert reconciled == 1

    status = client.get(
        f"/api/v1/agents/status/{run_id}", headers=_auth_headers(developer["access_token"])
    )
    body = status.json()
    assert body["status"] == "failed"
    assert "Interrupted" in body["error"]


# --- Phase 3.10: history filtering & notifications ---------------------------------


def test_run_history_filters_by_project(client: TestClient) -> None:
    developer = _developer(client)
    project = client.post(
        "/api/v1/projects",
        json={
            "name": "Filtered Project",
            "requirements": "A billing portal",
            "preferred_stack": ["React", "FastAPI"],
        },
        headers=_auth_headers(developer["access_token"]),
    ).json()

    bound = _start_run(
        client, developer["access_token"], project_id=project["id"], requirements="A billing portal"
    )
    _start_run(client, developer["access_token"], requirements="An unbound product")

    filtered = client.get(
        f"/api/v1/agents/history?project_id={project['id']}",
        headers=_auth_headers(developer["access_token"]),
    )
    body = filtered.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == bound["run_id"]

    all_runs = client.get(
        "/api/v1/agents/history", headers=_auth_headers(developer["access_token"])
    ).json()
    assert all_runs["total"] == 2


def test_completed_run_emits_notification(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    listed = client.get("/api/v1/notifications", headers=_auth_headers(developer["access_token"]))
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    notification = body["items"][0]
    assert notification["read"] is False
    assert notification["run_id"] == accepted["run_id"]
    assert "completed" in notification["title"].lower()


def test_cancelled_run_emits_notification(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    run_id = uuid.UUID(accepted["run_id"])

    client.post(f"/api/v1/agents/cancel/{run_id}", headers=_auth_headers(developer["access_token"]))
    asyncio.run(agent_service.execute_run(run_id))

    listed = client.get(
        "/api/v1/notifications", headers=_auth_headers(developer["access_token"])
    ).json()
    assert listed["total"] == 1
    assert "cancelled" in listed["items"][0]["title"].lower()


def test_mark_read_and_mark_all_read(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    headers = _auth_headers(developer["access_token"])
    listed = client.get("/api/v1/notifications", headers=headers).json()
    notification_id = listed["items"][0]["id"]

    marked = client.post(f"/api/v1/notifications/{notification_id}/read", headers=headers)
    assert marked.status_code == 200
    assert marked.json()["read"] is True

    again = client.get("/api/v1/notifications", headers=headers).json()
    assert again["items"][0]["read"] is True

    all_read = client.post("/api/v1/notifications/read-all", headers=headers)
    assert all_read.status_code == 204


def test_notifications_scoped_to_owner(client: TestClient) -> None:
    developer = _developer(client)
    accepted = _start_run(client, developer["access_token"])
    asyncio.run(agent_service.execute_run(uuid.UUID(accepted["run_id"])))

    other = _developer(client)
    listed = client.get(
        "/api/v1/notifications", headers=_auth_headers(other["access_token"])
    ).json()
    assert listed["total"] == 0

    hidden = client.post(
        f"/api/v1/notifications/{accepted['run_id']}/read",
        headers=_auth_headers(other["access_token"]),
    )
    assert hidden.status_code == 404
