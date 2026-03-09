# tests/conftest.py
"""
Fixtures compartilhadas para testes pytest do LUMINA.
Usa SQLite em memoria para isolamento total — sem tocar no banco de producao.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Garantir que estamos em modo de test antes de importar o app
os.environ["APP_ENV"] = "test"
os.environ["LUMINA_DESKTOP"] = "true"  # Desabilitar rate limits
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only-not-for-production"

@pytest.fixture(autouse=True)
def disable_limiter():
    from app.main import app
    app.state.limiter.enabled = False
    yield

from app.main import app
from app.database.session import get_db
from app.models.base import Base
from app.core.security import get_password_hash
from app.models.user import User

# SQLite em memoria para testes — isolado do banco de producao
SQLALCHEMY_TEST_URL = "sqlite://"


@pytest.fixture(scope="session")
def db_engine():
    """Engine SQLite em memoria compartilhado por toda a sessao de testes."""
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        SQLALCHEMY_TEST_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    from app.models.app_settings import AppSetting
    from app.models.booking import Booking
    from app.models.booking_conflict import BookingConflict
    from app.models.calendar_source import CalendarSource
    from app.models.guest import Guest
    from app.models.notification import Notification
    from app.models.property import Property
    from app.models.sync_action import SyncAction
    from app.models.sync_log import SyncLog
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(db_engine):
    """
    Sessao de banco isolada por teste.
    Faz rollback e limpa todas as tabelas apos cada teste.
    """
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()


    yield session

    from app.core.token_blacklist import get_token_blacklist
    blacklist = get_token_blacklist()
    if hasattr(blacklist, 'blacklisted_tokens'):
        blacklist.blacklisted_tokens.clear()
    elif hasattr(blacklist, '_tokens'):
        blacklist._tokens.clear()

    session.rollback()

    # Limpar tabelas na ordem correta (respeitar FK constraints)
    for table in reversed(Base.metadata.sorted_tables):
        try:
            session.execute(table.delete())
        except Exception:
            pass
    session.commit()
    session.close()


@pytest.fixture
def client(db_session):
    """
    TestClient com banco de dados substituido pelo de teste.
    Cada teste tem seu proprio cliente e sessao isolados.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    """Cria usuario admin no banco de teste."""
    user = User(
        email="admin@lumina.com",
        username="admin",
        hashed_password=get_password_hash("Admin123"),
        full_name="Admin Teste",
        is_active=True,
        is_admin=True,
        failed_login_attempts=0,
        locked_until=None,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(client, admin_user):
    """Autentica o admin e retorna o JWT token."""
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "Admin123",
    })
    assert response.status_code == 200, f"Login falhou: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    """Headers de autenticacao para requests protegidos."""
    return {"Authorization": f"Bearer {admin_token}"}
