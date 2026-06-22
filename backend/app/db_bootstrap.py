from .database import Base, SessionLocal, is_sqlite
from .sqlite_migrations import apply_sqlite_legacy_migrations


def _seed_initial_data() -> None:
    from .seed import seed_database

    with SessionLocal() as session:
        seed_database(session)
        session.commit()


def bootstrap_db() -> None:
    from . import models  # noqa: F401
    from . import database

    Base.metadata.create_all(bind=database.engine)
    if is_sqlite(database.database_url):
        apply_sqlite_legacy_migrations(database.engine)

    _seed_initial_data()
