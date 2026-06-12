from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import load_settings
from .ai_contract import get_default_model, get_default_provider


class Base(DeclarativeBase):
    pass


settings = load_settings()
database_url = settings.database_url


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def _create_engine(url: str):
    next_engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if _is_sqlite(url) else {},
    )

    @event.listens_for(next_engine, "connect")
    def _set_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        if _is_sqlite(url):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return next_engine


engine = _create_engine(database_url)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def configure_database(url: str) -> None:
    global database_url, engine

    engine.dispose()
    database_url = url
    engine = _create_engine(database_url)
    SessionLocal.configure(bind=engine)


def _sqlite_table_columns(connection, table_name: str) -> set[str]:
    return {
        row[1]
        for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
    }


def _add_sqlite_column_if_missing(
    connection,
    table_name: str,
    existing_columns: set[str],
    column_name: str,
    column_definition: str,
) -> None:
    if column_name in existing_columns:
        return
    connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}")
    existing_columns.add(column_name)


def _migrate_sqlite_users(connection) -> None:
    existing_columns = _sqlite_table_columns(connection, "users")
    _add_sqlite_column_if_missing(
        connection,
        "users",
        existing_columns,
        "photo_url",
        "photo_url VARCHAR(512)",
    )
    _add_sqlite_column_if_missing(
        connection,
        "users",
        existing_columns,
        "session_version",
        "session_version INTEGER NOT NULL DEFAULT 0",
    )


def _migrate_sqlite_words(connection) -> None:
    existing_columns = _sqlite_table_columns(connection, "words")
    _add_sqlite_column_if_missing(
        connection,
        "words",
        existing_columns,
        "accepted_answers",
        "accepted_answers JSON NOT NULL DEFAULT '[]'",
    )
    _add_sqlite_column_if_missing(
        connection,
        "words",
        existing_columns,
        "pronunciation_audio_url",
        "pronunciation_audio_url VARCHAR(512)",
    )
    _add_sqlite_column_if_missing(
        connection,
        "words",
        existing_columns,
        "is_flagged",
        "is_flagged BOOLEAN NOT NULL DEFAULT 0",
    )


def _migrate_sqlite_user_settings(connection) -> None:
    existing_columns = _sqlite_table_columns(connection, "user_settings")
    _add_sqlite_column_if_missing(
        connection,
        "user_settings",
        existing_columns,
        "toefl_target",
        "toefl_target INTEGER",
    )
    connection.exec_driver_sql(
        "UPDATE user_settings SET ai_provider = ?, ai_model = ? WHERE ai_provider = ?",
        (get_default_provider(), get_default_model(), "gemini"),
    )


def _backfill_sqlite_word_folders(connection) -> None:
    connection.exec_driver_sql(
        """
        INSERT OR IGNORE INTO word_folders (word_id, folder_id)
        SELECT id, folder_id FROM words WHERE folder_id IS NOT NULL
        """
    )


def _apply_sqlite_legacy_migrations() -> None:
    with engine.begin() as connection:
        _migrate_sqlite_users(connection)
        _migrate_sqlite_words(connection)
        _migrate_sqlite_user_settings(connection)
        _backfill_sqlite_word_folders(connection)


def _seed_initial_data() -> None:
    from .seed import seed_database

    with SessionLocal() as session:
        seed_database(session)
        session.commit()


def bootstrap_db() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    if _is_sqlite(database_url):
        _apply_sqlite_legacy_migrations()

    _seed_initial_data()
