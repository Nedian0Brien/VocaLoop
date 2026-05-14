import importlib
import sys
from pathlib import Path

import pytest
from sqlalchemy import select


def test_load_settings_generates_and_persists_auth_secret_when_missing(monkeypatch, tmp_path):
    monkeypatch.delenv("AUTH_SECRET_KEY", raising=False)
    auth_secret_file = tmp_path / "auth.secret"
    monkeypatch.setenv("AUTH_SECRET_FILE", str(auth_secret_file))
    module_name = "app.config"
    sys.modules.pop(module_name, None)

    config_path = Path(__file__).resolve().parents[1] / "app" / "config.py"
    spec = importlib.util.spec_from_file_location(module_name, config_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader

    spec.loader.exec_module(module)
    settings = module.load_settings()

    assert settings.auth_secret_key
    assert auth_secret_file.read_text(encoding="utf-8").strip() == settings.auth_secret_key


def test_load_settings_uses_existing_auth_secret_file_when_env_is_blank(monkeypatch, tmp_path):
    monkeypatch.setenv("AUTH_SECRET_KEY", "   ")
    auth_secret_file = tmp_path / "auth.secret"
    auth_secret_file.write_text("persisted-secret", encoding="utf-8")
    monkeypatch.setenv("AUTH_SECRET_FILE", str(auth_secret_file))
    importlib.invalidate_caches()
    sys.modules.pop("app.config", None)

    config_path = Path(__file__).resolve().parents[1] / "app" / "config.py"
    spec = importlib.util.spec_from_file_location("app.config", config_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader

    spec.loader.exec_module(module)
    settings = module.load_settings()

    assert settings.auth_secret_key == "persisted-secret"


@pytest.mark.parametrize(
    ("payload", "expected_field"),
    [
        ({"email": "", "password": "Password123!", "display_name": "User"}, "email"),
        ({"email": "not-an-email", "password": "Password123!", "display_name": "User"}, "email"),
        ({"email": "signup@example.com", "password": "", "display_name": "User"}, "password"),
        ({"email": "signup@example.com", "password": "short", "display_name": "User"}, "password"),
    ],
)
def test_signup_rejects_invalid_payloads(client, payload, expected_field):
    response = client.post("/api/auth/signup", json=payload)

    assert response.status_code == 422
    assert expected_field in response.text


@pytest.mark.parametrize(
    ("payload", "expected_field"),
    [
        ({"email": "", "password": "Password123!"}, "email"),
        ({"email": "not-an-email", "password": "Password123!"}, "email"),
        ({"email": "login@example.com", "password": ""}, "password"),
        ({"email": "login@example.com", "password": "short"}, None),
    ],
)
def test_login_rejects_invalid_payloads(client, payload, expected_field):
    response = client.post("/api/auth/login", json=payload)

    if expected_field is None:
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"
    else:
        assert response.status_code == 422
        assert expected_field in response.text


def test_signup_allows_password_without_uppercase_letter(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "lowercase@example.com",
            "password": "libera3920!",
            "display_name": "Lowercase User",
        },
    )

    assert response.status_code == 201
    assert response.json()["user"]["email"] == "lowercase@example.com"


def test_signup_creates_user_sets_http_only_cookie_and_supports_me(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "user@example.com",
            "password": "Password123!",
            "display_name": "User",
        },
    )

    assert response.status_code == 201
    assert response.json()["user"]["email"] == "user@example.com"
    assert response.json()["user"]["display_name"] == "User"
    assert "set-cookie" in response.headers
    assert "HttpOnly" in response.headers["set-cookie"]

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user"]["email"] == "user@example.com"


def test_login_authenticates_existing_user_and_rejects_bad_password(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "login@example.com",
            "password": "Password123!",
            "display_name": "Login User",
        },
    )
    assert signup_response.status_code == 201
    client.cookies.clear()

    login_response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "Password123!"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["email"] == "login@example.com"

    bad_login_response = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "Different123!"},
    )
    assert bad_login_response.status_code == 401
    assert bad_login_response.json()["detail"] == "Invalid email or password"


def test_logout_clears_cookie_and_blocks_me(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "logout@example.com",
            "password": "Password123!",
            "display_name": "Logout User",
        },
    )
    assert signup_response.status_code == 201

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert "set-cookie" in logout_response.headers
    assert "Max-Age=0" in logout_response.headers["set-cookie"]

    old_cookie = signup_response.cookies.get("vocaloop_session")
    assert old_cookie

    client.cookies.clear()
    client.cookies.set("vocaloop_session", old_cookie)

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 401
    assert me_response.json()["detail"] == "Not authenticated"


def test_signup_seeds_default_settings_and_sample_words(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "seed@example.com",
            "password": "Password123!",
            "display_name": "Seed User",
        },
    )

    assert response.status_code == 201

    from app.db import SessionLocal
    from app.models import User, UserSettings, Word
    from app.seed import seed_database

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == "seed@example.com"))
        assert user is not None

        settings = session.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
        assert settings is not None
        assert settings.ai_provider == "gemini"
        assert settings.ai_model == "gemini-3-flash-preview"

        words = session.scalars(select(Word).where(Word.user_id == user.id).order_by(Word.id)).all()
        assert len(words) == 5
        assert [word.word for word in words] == [
            "Serendipity",
            "Ephemeral",
            "Eloquent",
            "Resilience",
            "Ubiquitous",
        ]
        assert words[0].meaning_ko == "뜻밖의 행운"
        assert words[0].definitions == ["The occurrence and development of events by chance in a happy or beneficial way."]
        assert words[0].examples == [{"en": "Finding this restaurant was pure serendipity.", "ko": "이 식당을 발견한 것은 정말 뜻밖의 행운이었다."}]
        assert words[0].synonyms == ["chance", "fluke"]
        assert words[0].status == "new"
        assert words[0].stats == {"wrong_count": 0, "review_count": 0}

        seed_database(session, user)
        session.commit()

        words_after_backfill = session.scalars(select(Word).where(Word.user_id == user.id)).all()
        assert len(words_after_backfill) == 5
