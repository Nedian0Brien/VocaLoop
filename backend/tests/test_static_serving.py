from pathlib import Path
import re

import pytest
from fastapi import HTTPException


def test_vite_asset_from_dist_is_served(client):
    index_html = Path("dist/index.html").read_text(encoding="utf-8")
    match = re.search(r'/(assets/[^"]+\.(?:js|css))', index_html)

    assert match is not None

    response = client.get(f"/{match.group(1)}")

    assert response.status_code == 200
    assert response.headers["content-type"]
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"


def test_root_serves_spa_html(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.headers["cache-control"] == "no-cache"
    assert "<!doctype html>" in response.text.lower()


def test_frontend_index_symlink_escape_is_rejected(client, monkeypatch, tmp_path):
    from app import main as app_main

    frontend_root = tmp_path / "dist"
    frontend_root.mkdir()

    escaped_index = tmp_path / "escaped-index.html"
    escaped_index.write_text("<!doctype html><title>escaped</title>", encoding="utf-8")
    (frontend_root / "index.html").symlink_to(escaped_index)

    monkeypatch.setattr(app_main, "frontend_root", frontend_root)
    monkeypatch.setattr(app_main, "frontend_root_resolved", frontend_root.resolve())
    monkeypatch.setattr(app_main, "frontend_index", frontend_root / "index.html")

    response = client.get("/")

    assert response.status_code == 404


def test_frontend_route_serves_spa_html(client):
    response = client.get("/some/frontend/route")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.headers["cache-control"] == "no-cache"
    assert "<!doctype html>" in response.text.lower()


@pytest.mark.parametrize("path", ["/assets/missing.js", "/favicon.ico"])
def test_missing_static_looking_paths_return_404(client, path):
    response = client.get(path)

    assert response.status_code == 404


def test_health_endpoint_still_returns_json(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"status": "ok"}


def test_uploads_path_is_not_swallowed_by_spa_fallback(client):
    response = client.get("/uploads/missing.png")

    assert response.status_code == 404


def test_frontend_path_traversal_is_rejected(client):
    response = client.get("/%2e%2e/backend/app/main.py")

    assert response.status_code == 404


@pytest.mark.parametrize("path", ["..", "../foo"])
def test_extensionless_frontend_path_traversal_is_rejected(path):
    from app import main as app_main

    with pytest.raises(HTTPException) as exc_info:
        app_main.serve_frontend(path)

    assert exc_info.value.status_code == 404
