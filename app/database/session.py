"""
Gerenciamento de sessões do banco de dados.
Fornece dependency injection para FastAPI.
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.utils.logger import get_logger

logger = get_logger(__name__)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obter sessão do banco de dados.
    Usado em rotas FastAPI via Depends(get_db).

    Yields:
        Session: Sessão do banco de dados

    Example:
        @app.get("/bookings")
        def get_bookings(db: Session = Depends(get_db)):
            return db.query(Booking).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager para usar sessão do banco fora do FastAPI.

    Yields:
        Session: Sessão do banco de dados

    Example:
        with get_db_context() as db:
            booking = db.query(Booking).first()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_all_tables():
    """
    Cria todas as tabelas no banco de dados.
    Deve ser chamado durante a inicialização.
    """
    from app.models.base import Base
    from app.database.connection import engine

    # Importar todos os modelos para garantir que estão registrados
    from app.models import (
        property,
        calendar_source,
        booking,
        guest,
        sync_log,
        booking_conflict,
        sync_action,
    )
    from app.models.app_settings import AppSetting
    from app.models.notification import Notification
    from app.models.user import User

    logger.info("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("All database tables created successfully")


def drop_all_tables():
    """
    CUIDADO: Remove todas as tabelas do banco de dados.
    Use apenas para desenvolvimento/testes.
    """
    from app.models.base import Base
    from app.database.connection import engine

    logger.warning("Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    logger.warning("All database tables dropped")
