"""Foundation contract tests: health API, error envelope, CORS."""

from fastapi.testclient import TestClient

HEALTH_PAYLOAD = {"status": "healthy", "service": "ForgeAI Studio", "version": "1.0.0"}


def test_health_endpoint_returns_exact_payload(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == HEALTH_PAYLOAD


def test_liveness_probe(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness_probe_reports_components(client: TestClient) -> None:
    response = client.get("/readyz")
    assert response.status_code in (200, 503)
    payload = response.json()
    assert payload["status"] in ("ready", "not_ready")
    names = {component["name"] for component in payload["components"]}
    assert "database" in names
    assert "redis" in names


def test_unknown_route_returns_standard_envelope(client: TestClient) -> None:
    response = client.get("/api/v1/nonexistent")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["path"] == "/api/v1/nonexistent"
    assert body["error"]["request_id"]
    assert response.headers["X-Request-Id"] == body["error"]["request_id"]


def test_method_not_allowed_returns_envelope(client: TestClient) -> None:
    response = client.post("/api/v1/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_cors_preflight_from_allowed_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_denies_disallowed_origin(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers
