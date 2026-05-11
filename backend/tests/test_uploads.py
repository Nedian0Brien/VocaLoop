import io
import os
from pathlib import Path

import pytest


def _upload_path(photo_url: str) -> Path:
    uploads_root = Path(os.environ["UPLOADS_ROOT"])
    return uploads_root / photo_url.removeprefix("/uploads/")


def _png_bytes(payload: bytes = b"") -> bytes:
    return b"\x89PNG\r\n\x1a\n" + payload


def _jpeg_bytes(payload: bytes = b"") -> bytes:
    return b"\xff\xd8\xff" + payload


def test_authenticated_user_can_upload_profile_image_and_get_public_path(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "photo@example.com",
            "password": "Password123!",
            "display_name": "Photo User",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.png", io.BytesIO(_png_bytes(b"fake-png-data")), "image/png")},
    )

    assert response.status_code == 200
    assert response.json()["photo_url"].startswith("/uploads/profile/")

    photo_path = _upload_path(response.json()["photo_url"])
    assert photo_path.exists()
    assert photo_path.read_bytes() == b"\x89PNG\r\n\x1a\nfake-png-data"

    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.query(User).filter(User.email == "photo@example.com").one()
        assert user.photo_url == response.json()["photo_url"]


def test_unauthenticated_profile_image_upload_is_rejected(client):
    response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.png", io.BytesIO(b"fake"), "image/png")},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_non_image_profile_image_upload_is_rejected(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "non-image@example.com",
            "password": "Password123!",
            "display_name": "Non Image User",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("notes.txt", io.BytesIO(b"plain text"), "text/plain")},
    )

    assert response.status_code == 422
    assert "image" in response.text.lower()


def test_spoofed_image_content_type_with_non_image_bytes_is_rejected(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "spoofed@example.com",
            "password": "Password123!",
            "display_name": "Spoofed User",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.png", io.BytesIO(b"not really a png"), "image/png")},
    )

    assert response.status_code == 422
    assert "image" in response.text.lower()


def test_svg_profile_image_upload_is_rejected(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "svg@example.com",
            "password": "Password123!",
            "display_name": "SVG User",
        },
    )
    assert signup_response.status_code == 201

    svg_bytes = b"""<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"></svg>"""
    response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.svg", io.BytesIO(svg_bytes), "image/svg+xml")},
    )

    assert response.status_code == 422
    assert "image" in response.text.lower()


def test_oversized_profile_image_upload_is_rejected(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "oversized@example.com",
            "password": "Password123!",
            "display_name": "Oversized User",
        },
    )
    assert signup_response.status_code == 201

    response = client.post(
        "/api/uploads/profile-image",
        files={
            "file": (
                "huge.jpg",
                io.BytesIO(_jpeg_bytes(b"a" * (5 * 1024 * 1024))),
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 413
    assert "5" in response.text


def test_profile_image_upload_cleans_up_new_file_when_db_commit_fails(client, monkeypatch):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "commit-failure@example.com",
            "password": "Password123!",
            "display_name": "Commit Failure User",
        },
    )
    assert signup_response.status_code == 201

    from app.routes import uploads as uploads_module

    def failing_commit(self):
        raise RuntimeError("db commit failed")

    monkeypatch.setattr(uploads_module.Session, "commit", failing_commit)

    with pytest.raises(RuntimeError, match="db commit failed"):
        client.post(
            "/api/uploads/profile-image",
            files={"file": ("avatar.png", io.BytesIO(b"\x89PNG\r\n\x1a\nfake-png-data"), "image/png")},
        )

    profile_dir = Path(os.environ["UPLOADS_ROOT"]) / "profile"
    assert list(profile_dir.iterdir()) == []

    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.query(User).filter(User.email == "commit-failure@example.com").one()
        assert user.photo_url is None


def test_second_profile_image_upload_replaces_previous_file_for_same_user(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "replace@example.com",
            "password": "Password123!",
            "display_name": "Replace User",
        },
    )
    assert signup_response.status_code == 201

    first_response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("first.jpg", io.BytesIO(_jpeg_bytes(b"first-image")), "image/jpeg")},
    )
    assert first_response.status_code == 200
    first_path = _upload_path(first_response.json()["photo_url"])
    assert first_path.exists()

    second_response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("second.jpg", io.BytesIO(_jpeg_bytes(b"second-image")), "image/jpeg")},
    )

    assert second_response.status_code == 200
    second_path = _upload_path(second_response.json()["photo_url"])
    assert second_path.exists()
    assert second_path.read_bytes() == _jpeg_bytes(b"second-image")
    assert first_path.exists() is False

    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.query(User).filter(User.email == "replace@example.com").one()
        assert user.photo_url == second_response.json()["photo_url"]


def test_authenticated_user_can_delete_profile_image_and_photo_url_is_cleared(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "delete-photo@example.com",
            "password": "Password123!",
            "display_name": "Delete Photo User",
        },
    )
    assert signup_response.status_code == 201

    upload_response = client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.png", io.BytesIO(_png_bytes(b"payload")), "image/png")},
    )
    assert upload_response.status_code == 200
    photo_url = upload_response.json()["photo_url"]
    photo_path = _upload_path(photo_url)
    assert photo_path.exists()

    delete_response = client.delete("/api/uploads/profile-image")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"photo_url": None}
    assert photo_path.exists() is False

    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as session:
        user = session.query(User).filter(User.email == "delete-photo@example.com").one()
        assert user.photo_url is None


def test_unauthenticated_profile_image_delete_is_rejected(client):
    response = client.delete("/api/uploads/profile-image")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
