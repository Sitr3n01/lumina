"""
Gerenciamento de conexão com o banco de dados SQLite.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


# Ativar foreign keys no SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Ativa foreign keys constraints no SQLite"""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_db_engine():
    """
    Cria e configura o engine do banco de dados.

    Returns:
        Engine configurado do SQLAlchemy
    """
    logger.info("Creating database engine...")

    engine = create_engine(
        settings.DATABASE_URL,
        echo=False,  # Mude para True para ver queries SQL no console
        pool_pre_ping=True,  # Verifica conexão antes de usar
        connect_args={
            "check_same_thread": False,  # Permite uso em múltiplas threads (necessário para FastAPI)
        }
    )

    logger.info("Database engine created successfully")
    return engine


def get_session_factory():
    """
    Cria uma session factory para o banco de dados.

    Returns:
        sessionmaker configurado
    """
    engine = create_db_engine()

    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )

    return SessionLocal


# Engine global da aplicação
engine = create_db_engine()

# Session factory global
SessionLocal = get_session_factory()
