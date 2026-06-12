def test_configure_database_rebinds_sessionlocal_without_reimport(tmp_path):
    from app import db as app_db
    from app.models import User

    first_database_url = f"sqlite:///{tmp_path / 'first.db'}"
    second_database_url = f"sqlite:///{tmp_path / 'second.db'}"

    app_db.configure_database(first_database_url)
    app_db.bootstrap_db()
    with app_db.SessionLocal() as session:
        session.add(User(email="first@example.com", display_name="First", password_hash="hash"))
        session.commit()

    app_db.configure_database(second_database_url)
    app_db.bootstrap_db()
    with app_db.SessionLocal() as session:
        assert session.query(User).filter(User.email == "first@example.com").first() is None


def test_client_fixture_database_isolation_first_database(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "isolated@example.com",
            "password": "Password123!",
            "display_name": "Isolated User",
        },
    )

    assert response.status_code == 201


def test_client_fixture_database_isolation_second_database(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "isolated@example.com",
            "password": "Password123!",
            "display_name": "Isolated User",
        },
    )

    assert response.status_code == 201


def test_authenticated_client_starts_with_valid_session(authenticated_client):
    response = authenticated_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "user@example.com"
