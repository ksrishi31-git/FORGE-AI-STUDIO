"""Authentication & user management contract tests (Phase 3.2)."""

import asyncio
import uuid

from app.database.session import get_session_factory
from app.models.user import Role, User
from fastapi.testclient import TestClient
from sqlalchemy import update

PASSWORD = "Enterprise-Pass-123"


def _email(label: str) -> str:
    return f"{label}-{uuid.uuid4().hex[:8]}@example.com"


def _register(client: TestClient) -> dict:
    email = _email("user")
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test User",
            "email": email,
            "company_name": "Acme Corp",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["email"] == email
    # Every registered user is a developer — full product access.
    assert body["user"]["role"] == "developer"
    assert body["user"]["company_name"] == "Acme Corp"
    return {"email": email, **body}


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _promote_to_admin(user_id: str) -> None:
    """Promote a user directly in the test database (RBAC success-path setup)."""
    target_id = uuid.UUID(user_id)

    async def _promote() -> None:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(
                update(User).where(User.id == target_id).values(role=Role.ADMIN.value)
            )
            await session.commit()

    asyncio.run(_promote())


def test_register_and_login_flow(client: TestClient) -> None:
    registered = _register(client)
    email = registered["email"]

    login = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200
    assert login.json()["access_token"]

    wrong = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-password"})
    assert wrong.status_code == 401
    assert wrong.json()["error"]["code"] == "UNAUTHORIZED"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    registered = _register(client)
    duplicate = client.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": registered["email"], "password": PASSWORD},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "CONFLICT"


def test_register_company_name_is_optional(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Solo Dev", "email": _email("solo"), "password": PASSWORD},
    )
    assert response.status_code == 201
    assert response.json()["user"]["company_name"] is None
    assert response.json()["user"]["role"] == "developer"


def test_register_validates_password_length(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Test", "email": _email("short"), "password": "short"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_me_requires_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_me_returns_profile(client: TestClient) -> None:
    registered = _register(client)
    response = client.get("/api/v1/auth/me", headers=_auth_headers(registered["access_token"]))
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == registered["email"]
    assert body["company_name"] == "Acme Corp"
    assert body["role"] == "developer"
    assert body["is_active"] is True


def test_me_rejects_garbage_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me", headers=_auth_headers("not.a.jwt"))
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_refresh_rotates_token(client: TestClient) -> None:
    registered = _register(client)
    refresh = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": registered["refresh_token"]}
    )
    assert refresh.status_code == 200
    body = refresh.json()
    assert body["access_token"]
    assert body["refresh_token"] != registered["refresh_token"]

    # Reuse of the rotated token revokes the family.
    reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": registered["refresh_token"]})
    assert reuse.status_code == 401

    # Even the successor is dead after family revocation.
    successor = client.post("/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert successor.status_code == 401


def test_logout_revokes_refresh(client: TestClient) -> None:
    registered = _register(client)
    logout = client.post("/api/v1/auth/logout", json={"refresh_token": registered["refresh_token"]})
    assert logout.status_code == 204

    reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": registered["refresh_token"]})
    assert reuse.status_code == 401


def test_change_password_flow(client: TestClient) -> None:
    registered = _register(client)
    headers = _auth_headers(registered["access_token"])

    wrong_current = client.patch(
        "/api/v1/auth/change-password",
        json={"current_password": "wrong", "new_password": "New-Pass-456"},
        headers=headers,
    )
    assert wrong_current.status_code == 401

    changed = client.patch(
        "/api/v1/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "New-Pass-456"},
        headers=headers,
    )
    assert changed.status_code == 204

    # Old password no longer works; new password does.
    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": registered["email"], "password": PASSWORD},
    )
    assert old_login.status_code == 401
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": registered["email"], "password": "New-Pass-456"},
    )
    assert new_login.status_code == 200


def test_update_profile(client: TestClient) -> None:
    registered = _register(client)
    headers = _auth_headers(registered["access_token"])

    updated = client.patch(
        "/api/v1/auth/profile",
        json={
            "name": "Renamed User",
            "company_name": "Renamed Corp",
            "avatar": "https://example.com/avatar.png",
        },
        headers=headers,
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["name"] == "Renamed User"
    assert body["company_name"] == "Renamed Corp"
    assert body["avatar"] == "https://example.com/avatar.png"

    empty = client.patch("/api/v1/auth/profile", json={}, headers=headers)
    assert empty.status_code == 422


def test_forgot_and_reset_password(client: TestClient) -> None:
    registered = _register(client)

    forgot = client.post("/api/v1/auth/forgot-password", json={"email": registered["email"]})
    assert forgot.status_code == 200
    body = forgot.json()
    assert "reset link has been sent" in body["message"]
    # Development mode: reset URL returned when SMTP is not configured.
    assert body["reset_url"]

    token = body["reset_url"].rsplit("token=", maxsplit=1)[1]
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "Reset-Pass-789"},
    )
    assert reset.status_code == 204

    login = client.post(
        "/api/v1/auth/login",
        json={"email": registered["email"], "password": "Reset-Pass-789"},
    )
    assert login.status_code == 200

    # Token is single-use.
    again = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "Another-Pass-000"},
    )
    assert again.status_code == 400
    assert again.json()["error"]["code"] == "INVALID_RESET_TOKEN"


def test_forgot_password_hides_user_enumeration(client: TestClient) -> None:
    response = client.post("/api/v1/auth/forgot-password", json={"email": _email("ghost")})
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]
    assert response.json()["reset_url"] is None


def test_admin_users_list_enforces_role(client: TestClient) -> None:
    # A regular (developer) account must not reach the admin-only endpoint.
    registered = _register(client)
    as_regular = client.get("/api/v1/auth/users", headers=_auth_headers(registered["access_token"]))
    assert as_regular.status_code == 403
    assert as_regular.json()["error"]["code"] == "FORBIDDEN"

    unauthenticated = client.get("/api/v1/auth/users")
    assert unauthenticated.status_code == 401


def test_admin_users_list_success(client: TestClient) -> None:
    registered = _register(client)
    _promote_to_admin(registered["user"]["id"])

    as_admin = client.get("/api/v1/auth/users", headers=_auth_headers(registered["access_token"]))
    assert as_admin.status_code == 200
    emails = [user["email"] for user in as_admin.json()]
    assert registered["email"] in emails
