# tests/test_auth_endpoints.py
"""
Testes dos endpoints de autenticacao: register, login, me, logout, change-password, setup-status.
"""
import pytest


# ========== SETUP STATUS ==========

def test_setup_status_empty_db(client):
    """Sistema sem usuarios retorna needs_setup=true."""
    response = client.get("/api/v1/auth/setup-status")
    assert response.status_code == 200
    data = response.json()
    assert data["needs_setup"] is True


def test_setup_status_with_user(client, admin_user):
    """Sistema com usuario retorna needs_setup=false."""
    response = client.get("/api/v1/auth/setup-status")
    assert response.status_code == 200
    data = response.json()
    assert data["needs_setup"] is False


# ========== REGISTER ==========

def test_register_first_user(client):
    """Primeiro usuario e registrado com sucesso e automaticamente admin."""
    response = client.post("/api/v1/auth/register", json={
        "email": "first@lumina.test",
        "username": "firstuser",
        "password": "First123",
        "full_name": "First User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "first@lumina.test"
    assert data["username"] == "firstuser"
    assert data["is_admin"] is True
    assert "hashed_password" not in data
    assert "password" not in data


def test_register_blocked_after_first_user(client, admin_user):
    """Registro e bloqueado se ja existe usuario no sistema."""
    response = client.post("/api/v1/auth/register", json={
        "email": "second@lumina.test",
        "username": "seconduser",
        "password": "Second123",
    })
    assert response.status_code == 403


def test_register_weak_password(client):
    """Senha fraca e rejeitada com 422."""
    response = client.post("/api/v1/auth/register", json={
        "email": "weak@lumina.test",
        "username": "weakuser",
        "password": "123456",  # Sem maiuscula e muito curta
    })
    assert response.status_code == 422


def test_register_invalid_username(client):
    """Username com caracteres especiais e rejeitado."""
    response = client.post("/api/v1/auth/register", json={
        "email": "test@lumina.test",
        "username": "user name!",  # Espaco e ! invalidos
        "password": "Valid123",
    })
    assert response.status_code == 422


# ========== LOGIN ==========

def test_login_success(client, admin_user):
    """Login com credenciais validas retorna token JWT."""
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "Admin123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["is_admin"] is True
    assert "hashed_password" not in data["user"]


def test_login_with_email(client, admin_user):
    """Login com email tambem funciona."""
    response = client.post("/api/v1/auth/login", json={
        "username": "admin@lumina.test",
        "password": "Admin123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client, admin_user):
    """Login com senha errada retorna 401."""
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "senhaerrada",
    })
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    """Login com usuario inexistente retorna 401 (sem vazar existencia)."""
    response = client.post("/api/v1/auth/login", json={
        "username": "naoexiste",
        "password": "Qualquer123",
    })
    assert response.status_code == 401


# ========== GET ME ==========

def test_get_me_authenticated(client, admin_user, auth_headers):
    """GET /me com token valido retorna dados do usuario."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["email"] == "admin@lumina.test"
    assert "hashed_password" not in data


def test_get_me_no_token(client):
    """GET /me sem token retorna 403."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


def test_get_me_invalid_token(client):
    """GET /me com token invalido retorna 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer token.invalido.assinatura"},
    )
    assert response.status_code == 401


# ========== LOGOUT ==========

def test_logout_revokes_token(client, admin_user, auth_headers, admin_token):
    """Apos logout, o mesmo token e invalido."""
    # Logout
    response = client.post("/api/v1/auth/logout", headers=auth_headers)
    assert response.status_code == 200

    # Token deve estar na blacklist agora
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 401


# ========== CHANGE PASSWORD ==========

def test_change_password_success(client, admin_user, auth_headers):
    """Mudanca de senha com senha antiga correta funciona."""
    response = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "Admin123", "new_password": "NewAdmin456"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    # Consegue logar com nova senha
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "NewAdmin456",
    })
    assert login_resp.status_code == 200


def test_change_password_wrong_old(client, admin_user, auth_headers):
    """Mudanca de senha com senha antiga errada e rejeitada."""
    response = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "senhaerrada", "new_password": "NewAdmin456"},
        headers=auth_headers,
    )
    assert response.status_code in (400, 401)


def test_change_password_weak_new(client, admin_user, auth_headers):
    """Nova senha fraca e rejeitada com 422."""
    response = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "Admin123", "new_password": "fraca"},
        headers=auth_headers,
    )
    assert response.status_code == 422
