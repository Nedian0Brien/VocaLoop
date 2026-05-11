def test_tables_are_initialized(client):
    response = client.get("/api/health")
    assert response.status_code == 200

    from app.db import SessionLocal
    from app.models import Folder, User, UserSettings, Word

    session = SessionLocal()
    try:
        assert session.query(User).all() == []
        assert session.query(UserSettings).all() == []
        assert session.query(Folder).all() == []
        assert session.query(Word).all() == []
    finally:
        session.close()
