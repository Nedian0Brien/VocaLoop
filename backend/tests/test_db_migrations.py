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


def test_bootstrap_db_migrates_gemini_settings_to_codex_default(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy-gemini-settings.db"
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
            toefl_target INTEGER,
            ai_provider VARCHAR(50) NOT NULL,
            ai_model VARCHAR(100) NOT NULL,
            gemini_api_key TEXT,
            openai_api_key TEXT,
            claude_api_key TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users (id, email, display_name, password_hash)
        VALUES (1, 'legacy@example.com', 'Legacy User', 'hash');
        INSERT INTO user_settings (user_id, ai_provider, ai_model, gemini_api_key)
        VALUES (1, 'gemini', 'gemini-3-flash-preview', 'legacy-gemini-key');
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
    row = conn.execute("SELECT ai_provider, ai_model FROM user_settings WHERE user_id = 1").fetchone()
    conn.close()

    assert row == ("codex", "gpt-5.3-codex-spark")


def test_bootstrap_db_adds_missing_word_accepted_answers_column(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy-words.db"
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
        CREATE TABLE words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            folder_id INTEGER,
            word VARCHAR(255) NOT NULL,
            meaning_ko TEXT,
            pronunciation VARCHAR(255),
            pos VARCHAR(100),
            definitions JSON NOT NULL DEFAULT '[]',
            definitions_ko JSON NOT NULL DEFAULT '[]',
            examples JSON NOT NULL DEFAULT '[]',
            synonyms JSON NOT NULL DEFAULT '[]',
            nuance TEXT,
            learning_rate INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'new',
            stats JSON NOT NULL DEFAULT '{}',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users (id, email, display_name, password_hash)
        VALUES (1, 'legacy-word@example.com', 'Legacy Word User', 'hash');
        INSERT INTO words (user_id, word, meaning_ko)
        VALUES (1, 'ubiquitous', '어디에나 있는');
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
    columns = {row[1] for row in conn.execute("PRAGMA table_info(words)").fetchall()}
    accepted_answers = conn.execute("SELECT accepted_answers FROM words WHERE word = 'ubiquitous'").fetchone()[0]
    conn.close()

    assert "accepted_answers" in columns
    assert accepted_answers == "[]"
