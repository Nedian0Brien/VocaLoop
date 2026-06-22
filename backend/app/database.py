from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import load_settings


class Base(DeclarativeBase):
    pass


settings = load_settings()
database_url = settings.database_url


def is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def create_database_engine(url: str):
    next_engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if is_sqlite(url) else {},
    )

    @event.listens_for(next_engine, "connect")
    def _set_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        if is_sqlite(url):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return next_engine


engine = create_database_engine(database_url)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def configure_database(url: str) -> None:
    global database_url, engine

    engine.dispose()
    database_url = url
    engine = create_database_engine(database_url)
    SessionLocal.configure(bind=engine)
