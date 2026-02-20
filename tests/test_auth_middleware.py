# tests/test_auth_middleware.py
"""
Testes do middleware de autenticacao JWT e comportamento de seguranca.
Valida: tokens invalidos, expirados, adulterados, lockout de conta.
"""
import pytest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token


# ========== ENDPOINTS PUBLICOS ==========

def test_health_check_no_auth(client):
    """Health check e publico — nao requer autenticacao."""
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_setup_status_no_auth(client):
    """setup-status e publico — nao requer autenticacao."""
    response = client.get("/api/v1/auth/setup-status")
    assert response.status_code == 200


# ========== ENDPOINTS PROTEGIDOS ==========

def test_protected_endpoint_no_auth(client, admin_user):
    """Endpoint protegido sem token retorna 403."""
    response = client.get("/api/info")
    assert response.status_code in (401, 403)


def test_protected_endpoint_valid_token(client, admin_user, auth_headers):
    """Endpoint protegido com token valido retorna 200."""
    response = client.get("/api/info", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "app_name" in data


def test_protected_endpoint_tampered_token(client, admin_user):
    """Token com assinatura adulterada e rejeitado com 401."""
    # Criar token valido e alterar a assinatura
    valid_token = create_access_token({"sub": "1"})
    parts = valid_token.split(".")
    tampered = parts[0] + "." + parts[1] + ".assinatura_falsa"

    response = client.get(
        "/api/info",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert response.status_code == 401


def test_protected_endpoint_expired_token(client, admin_user):
    """Token expirado e rejeitado com 401."""
    expired_token = create_access_token(
        data={"sub": str(admin_user.id)},
        expires_delta=timedelta(seconds=-1),  # Ja expirado
    )
    response = client.get(
        "/api/info",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


def test_protected_endpoint_malformed_header(client, admin_user):
    """Header Authorization malformado e rejeitado."""
    response = client.get(
        "/api/info",
        headers={"Authorization": "nao-e-um-bearer-token"},
    )
    assert response.status_code in (401, 403)


# ========== ACCOUNT LOCKOUT ==========

def test_account_lockout_after_failed_attempts(client, admin_user):
    """
    Apos 5 tentativas de login com senha errada, conta e bloqueada.
    A 6a tentativa (mesmo com senha correta) deve falhar por lockout.
    """
    # 5 tentativas erradas
    for i in range(5):
        resp = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": f"senhaerrada{i}",
        })
        assert resp.status_code == 401

    # 6a tentativa — conta deve estar bloqueada
    resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "Admin123",  # Senha correta, mas conta bloqueada
    })
    assert resp.status_code == 401
    # Mensagem deve mencionar bloqueio (sem vazar detalhes sensiveis)
    detail = resp.json().get("detail", "")
    assert "bloqueada" in detail.lower() or "locked" in detail.lower() or "tentativa" in detail.lower()


# ========== INACTIVE USER ==========

def test_inactive_user_cannot_login(client, db_session):
    """Usuario inativo nao consegue fazer login."""
    from app.models.user import User
    from app.core.security import get_password_hash

    inactive = User(
        email="inactive@lumina.test",
        username="inactiveuser",
        hashed_password=get_password_hash("Active123"),
        is_active=False,  # Inativo
        is_admin=False,
        failed_login_attempts=0,
    )
    db_session.add(inactive)
    db_session.commit()

    response = client.post("/api/v1/auth/login", json={
        "username": "inactiveuser",
        "password": "Active123",
    })
    assert response.status_code == 401
