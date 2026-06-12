import importlib
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture()
def client(monkeypatch):
    with tempfile.TemporaryDirectory(prefix="vocaloop-backend-test-") as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        uploads_root = Path(tmpdir) / "uploads"
        monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
        monkeypatch.setenv("AUTH_SECRET_KEY", "test-auth-secret")
        monkeypatch.setenv("UPLOADS_ROOT", str(uploads_root))

        for module_name in [name for name in sys.modules if name == "app" or name.startswith("app.")]:
            sys.modules.pop(module_name)

        importlib.invalidate_caches()

        from app.main import app  # noqa: E402

        with TestClient(app) as test_client:
            yield test_client


@pytest.fixture()
def authenticated_client(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "user@example.com",
            "password": "Password123!",
            "display_name": "Test User",
        },
    )
    assert response.status_code == 201
    return client
