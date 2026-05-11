from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import load_settings


class Base(DeclarativeBase):
    pass


settings = load_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)


@event.listens_for(engine, "connect")
def _set_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def bootstrap_db() -> None:
    from . import models  # noqa: F401
    from .seed import seed_database

    Base.metadata.create_all(bind=engine)
    if settings.database_url.startswith("sqlite"):
        with engine.begin() as connection:
            existing_columns = {
                row[1]
                for row in connection.exec_driver_sql("PRAGMA table_info(users)").fetchall()
            }
            if "photo_url" not in existing_columns:
                connection.exec_driver_sql("ALTER TABLE users ADD COLUMN photo_url VARCHAR(512)")
            if "session_version" not in existing_columns:
                connection.exec_driver_sql(
                    "ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0"
                )

            existing_settings_columns = {
                row[1]
                for row in connection.exec_driver_sql("PRAGMA table_info(user_settings)").fetchall()
            }
            if "toefl_target" not in existing_settings_columns:
                connection.exec_driver_sql("ALTER TABLE user_settings ADD COLUMN toefl_target INTEGER")

    with SessionLocal() as session:
        seed_database(session)
        session.commit()
