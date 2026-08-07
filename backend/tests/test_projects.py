"""Project workspace contract tests (Phase 3.4)."""

import asyncio
import uuid

from app.database.session import get_session_factory
from app.models.user import Role, User
from fastapi.testclient import TestClient
from sqlalchemy import update

PASSWORD = "Enterprise-Pass-123"

PROJECT_PAYLOAD = {
    "name": "Invoicing Platform",
    "description": "Automated invoicing and billing for SMBs.",
    "business_domain": "Fintech",
    "requirements": "Generate invoices, track payments, send reminders.",
    "target_users": "Small business owners and accountants.",
    "preferred_stack": ["Python", "FastAPI", "PostgreSQL"],
}


def _email(label: str) -> str:
    return f"{label}-{uuid.uuid4().hex[:8]}@example.com"


def _register(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": _email("user"), "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _set_role(user_id: str, role: Role) -> None:
    target_id = uuid.UUID(user_id)

    async def _promote() -> None:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(update(User).where(User.id == target_id).values(role=role.value))
            await session.commit()

    asyncio.run(_promote())


def _developer(client: TestClient) -> dict:
    """Every registered user is a developer (no viewer tier)."""
    return _register(client)


def _create_project(client: TestClient, token: str, **overrides) -> dict:
    response = client.post(
        "/api/v1/projects",
        json={**PROJECT_PAYLOAD, **overrides},
        headers=_auth_headers(token),
    )
    assert response.status_code == 201
    return response.json()


# --- Authentication & RBAC ---------------------------------------------------------


def test_list_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/projects")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_registered_user_can_create_project(client: TestClient) -> None:
    """A freshly registered user can create projects immediately."""
    registered = _register(client)
    project = _create_project(client, registered["access_token"])
    assert project["owner"] == "Test User"


def test_unauthenticated_cannot_create_project(client: TestClient) -> None:
    response = client.post("/api/v1/projects", json=PROJECT_PAYLOAD)
    assert response.status_code == 401


# --- Create -------------------------------------------------------------------------


def test_create_project(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    assert project["name"] == PROJECT_PAYLOAD["name"]
    assert project["slug"] == "invoicing-platform"
    assert project["status"] == "planning"
    assert project["priority"] == "medium"
    assert project["visibility"] == "private"
    assert project["archived"] is False
    assert project["progress"] == 0
    assert project["owner"] == "Test User"
    assert project["preferred_stack"] == ["Python", "FastAPI", "PostgreSQL"]


def test_create_duplicate_name_generates_unique_slug(client: TestClient) -> None:
    developer = _developer(client)
    first = _create_project(client, developer["access_token"])
    second = _create_project(client, developer["access_token"])

    assert first["slug"] == "invoicing-platform"
    assert second["slug"] == "invoicing-platform-2"


def test_create_validates_name(client: TestClient) -> None:
    developer = _developer(client)
    response = client.post(
        "/api/v1/projects",
        json={**PROJECT_PAYLOAD, "name": ""},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_validates_enum_values(client: TestClient) -> None:
    developer = _developer(client)
    response = client.post(
        "/api/v1/projects",
        json={**PROJECT_PAYLOAD, "status": "shipping"},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 422


# --- List, scope, pagination ---------------------------------------------------------


def test_list_is_scoped_to_owner(client: TestClient) -> None:
    developer = _developer(client)
    _create_project(client, developer["access_token"])

    other = _developer(client)
    response = client.get("/api/v1/projects", headers=_auth_headers(other["access_token"]))
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_admin_lists_all_projects(client: TestClient) -> None:
    developer = _developer(client)
    _create_project(client, developer["access_token"])

    admin = _register(client)
    _set_role(admin["user"]["id"], Role.ADMIN)
    response = client.get("/api/v1/projects", headers=_auth_headers(admin["access_token"]))
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_list_pagination(client: TestClient) -> None:
    developer = _developer(client)
    for index in range(3):
        _create_project(client, developer["access_token"], name=f"Project {index}")

    first = client.get(
        "/api/v1/projects?page=1&page_size=2", headers=_auth_headers(developer["access_token"])
    )
    assert first.status_code == 200
    body = first.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2
    assert body["page"] == 1
    assert body["page_size"] == 2

    second = client.get(
        "/api/v1/projects?page=2&page_size=2", headers=_auth_headers(developer["access_token"])
    )
    assert len(second.json()["items"]) == 1


def test_list_validates_page_size(client: TestClient) -> None:
    developer = _developer(client)
    response = client.get(
        "/api/v1/projects?page_size=0", headers=_auth_headers(developer["access_token"])
    )
    assert response.status_code == 422


# --- Search & filters -----------------------------------------------------------------


def test_search_matches_name_and_domain(client: TestClient) -> None:
    developer = _developer(client)
    _create_project(client, developer["access_token"])
    _create_project(
        client,
        developer["access_token"],
        name="Payroll Engine",
        business_domain="HR",
        description="Employee payroll processing and payslips.",
    )

    by_name = client.get(
        "/api/v1/projects?q=invoicing", headers=_auth_headers(developer["access_token"])
    )
    assert by_name.json()["total"] == 1

    by_domain = client.get(
        "/api/v1/projects?q=hr", headers=_auth_headers(developer["access_token"])
    )
    assert by_domain.json()["total"] == 1


def test_filter_by_status_and_priority(client: TestClient) -> None:
    developer = _developer(client)
    _create_project(client, developer["access_token"], priority="high")
    _create_project(client, developer["access_token"], name="Analytics", priority="low")

    high = client.get(
        "/api/v1/projects?priority=high", headers=_auth_headers(developer["access_token"])
    )
    assert high.json()["total"] == 1
    assert high.json()["items"][0]["name"] == "Invoicing Platform"


def test_search_endpoint(client: TestClient) -> None:
    developer = _developer(client)
    _create_project(client, developer["access_token"])
    _create_project(client, developer["access_token"], name="Payroll Engine")

    response = client.get(
        "/api/v1/projects/search?q=payroll", headers=_auth_headers(developer["access_token"])
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["name"] == "Payroll Engine"
    assert items[0]["slug"] == "payroll-engine"


def test_search_requires_query(client: TestClient) -> None:
    developer = _developer(client)
    response = client.get(
        "/api/v1/projects/search", headers=_auth_headers(developer["access_token"])
    )
    assert response.status_code == 422


# --- Detail & ownership ----------------------------------------------------------------


def test_get_project_detail(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    response = client.get(
        f"/api/v1/projects/{project['id']}", headers=_auth_headers(developer["access_token"])
    )
    assert response.status_code == 200
    body = response.json()
    assert body["description"] == PROJECT_PAYLOAD["description"]
    assert body["requirements"] == PROJECT_PAYLOAD["requirements"]
    assert body["business_domain"] == "Fintech"


def test_non_owner_cannot_read_project(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    other = _developer(client)
    response = client.get(
        f"/api/v1/projects/{project['id']}", headers=_auth_headers(other["access_token"])
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_missing_project_returns_404(client: TestClient) -> None:
    developer = _developer(client)
    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}", headers=_auth_headers(developer["access_token"])
    )
    assert response.status_code == 404


# --- Update ------------------------------------------------------------------------------


def test_update_project_regenerates_slug(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": "Renamed Platform", "priority": "high"},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renamed Platform"
    assert body["slug"] == "renamed-platform"
    assert body["priority"] == "high"


def test_update_requires_at_least_one_field(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 422


def test_update_can_clear_optional_fields(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])
    assert project["description"] is not None
    assert project["preferred_stack"] is not None

    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"description": "", "business_domain": "", "preferred_stack": []},
        headers=_auth_headers(developer["access_token"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["description"] is None
    assert body["business_domain"] is None
    assert body["preferred_stack"] is None
    assert body["name"] == "Invoicing Platform"


def test_non_owner_cannot_update_project(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    other = _developer(client)
    response = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": "Hijacked"},
        headers=_auth_headers(other["access_token"]),
    )
    assert response.status_code == 404


# --- Soft delete -------------------------------------------------------------------------


def test_soft_delete_hides_project(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])
    headers = _auth_headers(developer["access_token"])

    response = client.delete(f"/api/v1/projects/{project['id']}", headers=headers)
    assert response.status_code == 204

    listed = client.get("/api/v1/projects", headers=headers)
    assert listed.json()["total"] == 0

    detail = client.get(f"/api/v1/projects/{project['id']}", headers=headers)
    assert detail.status_code == 404


def test_soft_deleted_slug_stays_reserved(client: TestClient) -> None:
    developer = _developer(client)
    first = _create_project(client, developer["access_token"])
    headers = _auth_headers(developer["access_token"])
    client.delete(f"/api/v1/projects/{first['id']}", headers=headers)

    # The unique slug constraint still covers soft-deleted rows, so a new
    # project of the same name gets a suffixed slug.
    second = _create_project(client, developer["access_token"])
    assert second["slug"] == "invoicing-platform-2"


# --- Archive / restore -------------------------------------------------------------------


def test_archive_and_restore(client: TestClient) -> None:
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])
    headers = _auth_headers(developer["access_token"])

    archived = client.post(f"/api/v1/projects/{project['id']}/archive", headers=headers)
    assert archived.status_code == 200
    assert archived.json()["archived"] is True

    # Default list excludes archived projects; the filter surfaces them.
    default = client.get("/api/v1/projects", headers=headers)
    assert default.json()["total"] == 0
    archived_list = client.get("/api/v1/projects?archived=true", headers=headers)
    assert archived_list.json()["total"] == 1

    restored = client.post(f"/api/v1/projects/{project['id']}/restore", headers=headers)
    assert restored.status_code == 200
    assert restored.json()["archived"] is False

    default_after = client.get("/api/v1/projects", headers=headers)
    assert default_after.json()["total"] == 1


def test_non_owner_cannot_archive_project(client: TestClient) -> None:
    """Ownership, not a role tier, protects another user's project."""
    developer = _developer(client)
    project = _create_project(client, developer["access_token"])

    other = _register(client)
    response = client.post(
        f"/api/v1/projects/{project['id']}/archive",
        headers=_auth_headers(other["access_token"]),
    )
    assert response.status_code == 404
