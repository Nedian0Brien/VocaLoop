import importlib
import sqlite3
import sys


def test_bootstrap_db_adds_missing_session_version_column(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) NOT NULL UNIQUE,
            display_name VARCHAR(255),
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            photo_url VARCHAR(512)
        );
        """
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("AUTH_SECRET_KEY", "test-auth-secret")
    monkeypatch.setenv("UPLOADS_ROOT", str(tmp_path / "uploads"))

    for module_name in [name for name in sys.modules if name == "app" or name.startswith("app.")]:
        sys.modules.pop(module_name)

    importlib.invalidate_caches()

    from app.db import bootstrap_db

    bootstrap_db()

    conn = sqlite3.connect(db_path)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    conn.close()

    assert "session_version" in columns


def test_bootstrap_db_adds_missing_toefl_target_column(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy-settings.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) NOT NULL UNIQUE,
            display_name VARCHAR(255),
            password_hash VARCHAR(255) NOT NULL,
            session_version INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            photo_url VARCHAR(512)
        );
        CREATE TABLE user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            ai_provider VARCHAR(50) NOT NULL,
            ai_model VARCHAR(100) NOT NULL,
            gemini_api_key TEXT,
            openai_api_key TEXT,
            claude_api_key TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("AUTH_SECRET_KEY", "test-auth-secret")
    monkeypatch.setenv("UPLOADS_ROOT", str(tmp_path / "uploads"))

    for module_name in [name for name in sys.modules if name == "app" or name.startswith("app.")]:
        sys.modules.pop(module_name)

    importlib.invalidate_caches()

    from app.db import bootstrap_db

    bootstrap_db()

    conn = sqlite3.connect(db_path)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(user_settings)").fetchall()}
    conn.close()

    assert "toefl_target" in columns
