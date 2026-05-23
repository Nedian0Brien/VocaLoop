from sqlalchemy import select


def test_settings_provider_catalog_uses_shared_contract(client):
    response = client.get("/api/settings/providers")

    assert response.status_code == 200
    assert response.json()["defaultProvider"] == "codex"
    assert response.json()["providers"]["codex"]["defaultModel"] == "gpt-5.3-codex-spark"
    assert response.json()["providers"]["codex"]["requiresApiKey"] is False
    assert response.json()["providers"]["gemini"]["defaultModel"] == "gemini-3-flash-preview"
    assert "gemini-2.0-flash" not in response.json()["providers"]["gemini"]["models"]


def test_settings_get_backfills_missing_row_for_existing_authenticated_user(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-backfill@example.com",
            "password": "Password123!",
            "display_name": "Settings Backfill",
        },
    )
    assert signup_response.status_code == 201

    from app.db import SessionLocal
    from app.models import User, UserSettings

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == "settings-backfill@example.com"))
        assert user is not None

        settings = session.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
        assert settings is not None
        session.delete(settings)
        session.commit()

    response = client.get("/api/settings")

    assert response.status_code == 200
    assert response.json() == {
        "displayName": "Settings Backfill",
        "toeflTarget": None,
        "provider": "codex",
        "model": "gpt-5.3-codex-spark",
        "geminiApiKey": None,
        "openaiApiKey": None,
        "claudeApiKey": None,
    }

    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == "settings-backfill@example.com"))
        assert user is not None
        settings = session.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
        assert settings is not None
        assert settings.ai_provider == "codex"
        assert settings.ai_model == "gpt-5.3-codex-spark"


def test_provider_only_settings_update_defaults_model_for_new_provider(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-provider-only@example.com",
            "password": "Password123!",
            "display_name": "Settings Provider Only",
        },
    )
    assert signup_response.status_code == 201

    response = client.put(
        "/api/settings",
        json={
            "provider": "openai",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "displayName": "Settings Provider Only",
        "toeflTarget": None,
        "provider": "openai",
        "model": "gpt-4.1",
        "geminiApiKey": None,
        "openaiApiKey": None,
        "claudeApiKey": None,
    }


def test_authenticated_user_can_read_seeded_settings(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-reader@example.com",
            "password": "Password123!",
            "display_name": "Settings Reader",
        },
    )
    assert signup_response.status_code == 201

    response = client.get("/api/settings")

    assert response.status_code == 200
    assert response.json() == {
        "displayName": "Settings Reader",
        "toeflTarget": None,
        "provider": "codex",
        "model": "gpt-5.3-codex-spark",
        "geminiApiKey": None,
        "openaiApiKey": None,
        "claudeApiKey": None,
    }


def test_authenticated_user_can_update_settings_and_get_updated_values_back(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-updater@example.com",
            "password": "Password123!",
            "display_name": "Settings Updater",
        },
    )
    assert signup_response.status_code == 201

    update_response = client.put(
        "/api/settings",
        json={
            "displayName": "Updated Name",
            "toeflTarget": 108,
            "provider": "openai",
            "model": "gpt-4o-mini",
            "openaiApiKey": "openai-test-key",
        },
    )

    assert update_response.status_code == 200
    assert update_response.json() == {
        "displayName": "Updated Name",
        "toeflTarget": 108,
        "provider": "openai",
        "model": "gpt-4o-mini",
        "geminiApiKey": None,
        "openaiApiKey": "openai-test-key",
        "claudeApiKey": None,
    }

    read_back_response = client.get("/api/settings")
    assert read_back_response.status_code == 200
    assert read_back_response.json() == update_response.json()


def test_unauthenticated_access_to_settings_is_rejected(client):
    response = client.get("/api/settings")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    response = client.put(
        "/api/settings",
        json={"provider": "gemini", "model": "gemini-2.5-flash"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_invalid_provider_model_combination_is_rejected(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-invalid@example.com",
            "password": "Password123!",
            "display_name": "Settings Invalid",
        },
    )
    assert signup_response.status_code == 201

    response = client.put(
        "/api/settings",
        json={
            "provider": "gemini",
            "model": "gpt-4o-mini",
        },
    )

    assert response.status_code == 422
    assert "model" in response.text


def test_settings_are_scoped_to_the_authenticated_user(client):
    first_signup = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-owner-one@example.com",
            "password": "Password123!",
            "display_name": "Owner One",
        },
    )
    assert first_signup.status_code == 201

    first_update = client.put(
        "/api/settings",
        json={
            "displayName": "Owner One Updated",
            "toeflTarget": 112,
            "provider": "gemini",
            "model": "gemini-3-flash-preview",
            "geminiApiKey": "gemini-owner-one-key",
        },
    )
    assert first_update.status_code == 200

    first_cookie = first_signup.cookies.get("vocaloop_session")
    assert first_cookie is not None

    client.cookies.clear()

    second_signup = client.post(
        "/api/auth/signup",
        json={
            "email": "settings-owner-two@example.com",
            "password": "Password123!",
            "display_name": "Owner Two",
        },
    )
    assert second_signup.status_code == 201

    second_update = client.put(
        "/api/settings",
        json={
            "displayName": "Owner Two Updated",
            "toeflTarget": 98,
            "provider": "claude",
            "model": "claude-3-5-sonnet-latest",
            "claudeApiKey": "claude-owner-two-key",
        },
    )
    assert second_update.status_code == 200
    assert second_update.json()["displayName"] == "Owner Two Updated"

    client.cookies.clear()
    client.cookies.set("vocaloop_session", first_cookie)

    first_user_response = client.get("/api/settings")
    assert first_user_response.status_code == 200
    assert first_user_response.json() == first_update.json()
