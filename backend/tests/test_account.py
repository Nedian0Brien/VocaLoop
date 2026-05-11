import io


def _png_bytes(payload: bytes = b"") -> bytes:
    return b"\x89PNG\r\n\x1a\n" + payload


def test_reset_data_requires_authentication(client):
    response = client.post("/api/account/reset-data")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_authenticated_user_can_reset_words_and_folders_in_one_request(client):
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "reset@example.com",
            "password": "Password123!",
            "display_name": "Reset User",
        },
    )
    assert signup.status_code == 201

    # Seeded sample words exist.
    words_before = client.get("/api/words")
    assert words_before.status_code == 200
    assert len(words_before.json()) == 5

    reset_response = client.post("/api/account/reset-data")
    assert reset_response.status_code == 200
    assert reset_response.json()["deleted_words"] == 5
    assert reset_response.json()["deleted_folders"] == 0

    words_after = client.get("/api/words")
    assert words_after.status_code == 200
    assert words_after.json() == []

    folders_after = client.get("/api/folders")
    assert folders_after.status_code == 200
    assert folders_after.json() == []


def test_delete_account_requires_authentication(client):
    response = client.post("/api/account/delete", json={"password": "Password123!"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_delete_account_rejects_wrong_password(client):
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "delete-wrong@example.com",
            "password": "Password123!",
            "display_name": "Wrong Password",
        },
    )
    assert signup.status_code == 201

    response = client.post("/api/account/delete", json={"password": "Different123!"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid password"


def test_delete_account_deletes_user_data_clears_cookie_and_removes_profile_photo(client):
    signup = client.post(
        "/api/auth/signup",
        json={
            "email": "delete@example.com",
            "password": "Password123!",
            "display_name": "Delete User",
        },
    )
    assert signup.status_code == 201

    upload = client.post(
        "/api/uploads/profile-image",
        files={"file": ("avatar.png", io.BytesIO(_png_bytes(b"img")), "image/png")},
    )
    assert upload.status_code == 200
    photo_url = upload.json()["photo_url"]
    assert photo_url.startswith("/uploads/profile/")

    delete_response = client.post("/api/account/delete", json={"password": "Password123!"})
    assert delete_response.status_code == 200
    assert delete_response.json()["detail"] == "Account deleted"
    assert "set-cookie" in delete_response.headers
    assert "Max-Age=0" in delete_response.headers["set-cookie"]

    # Session should be invalid after deletion.
    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 401

    # The profile photo file should be removed.
    import os
    from pathlib import Path

    uploads_root = Path(os.environ["UPLOADS_ROOT"])
    photo_path = uploads_root / photo_url.removeprefix("/uploads/")
    assert photo_path.exists() is False
