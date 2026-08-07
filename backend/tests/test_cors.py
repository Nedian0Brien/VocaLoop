import pytest


NATIVE_ORIGIN = "capacitor://localhost"


def test_preflight_from_native_app_origin_is_allowed(client):
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": NATIVE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-vocaloop-client,authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == NATIVE_ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"


def test_actual_request_from_native_app_origin_carries_cors_headers(client):
    response = client.get("/api/health", headers={"Origin": NATIVE_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == NATIVE_ORIGIN


def test_unknown_origin_is_not_reflected(client):
    response = client.get("/api/health", headers={"Origin": "https://evil.example.com"})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


@pytest.mark.parametrize("origin", ["capacitor://localhost", "ionic://localhost", "http://localhost"])
def test_default_native_origins_are_allowed(client, origin):
    response = client.get("/api/health", headers={"Origin": origin})

    assert response.headers.get("access-control-allow-origin") == origin


def test_extra_origins_can_be_added_through_env(monkeypatch):
    from app.config import load_settings

    monkeypatch.setenv("NATIVE_APP_ORIGINS", "https://staging.example.com, capacitor://localhost")
    settings = load_settings()

    assert "https://staging.example.com" in settings.native_app_origins
    # 기본값과 중복되어도 한 번만 들어간다.
    assert settings.native_app_origins.count("capacitor://localhost") == 1
