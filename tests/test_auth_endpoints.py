# tests/test_auth_endpoints.py
"""
Testes dos endpoints de autenticacao: register, login, me, logout, change-password, setup-status.
"""


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
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "first@lumina.com",
            "username": "firstuser",
            "password": "First123",
            "full_name": "First User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "first@lumina.com"
    assert data["username"] == "firstuser"
    assert data["is_admin"] is True
    assert "hashed_password" not in data
    assert "password" not in data


def test_register_blocked_after_first_user(client, admin_user):
    """Registro e bloqueado se ja existe usuario no sistema."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "second@lumina.com",
            "username": "seconduser",
            "password": "Second123",
        },
    )
    assert response.status_code == 403


def test_register_weak_password(client):
    """Senha fraca e rejeitada com 422."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@lumina.com",
            "username": "weakuser",
            "password": "123456",  # Sem maiuscula e muito curta
        },
    )
    assert response.status_code == 422


def test_register_invalid_username(client):
    """Username com caracteres especiais e rejeitado."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@lumina.com",
            "username": "user name!",  # Espaco e ! invalidos
            "password": "Valid123",
        },
    )
    assert response.status_code == 422


# ========== LOGIN ==========


def test_login_success(client, admin_user):
    """Login com credenciais validas retorna token JWT."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "password": "Admin123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["is_admin"] is True
    assert "hashed_password" not in data["user"]


def test_login_with_email(client, admin_user):
    """Login com email tambem funciona."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin@lumina.com",
            "password": "Admin123",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client, admin_user):
    """Login com senha errada retorna 401."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "password": "senhaerrada",
        },
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    """Login com usuario inexistente retorna 401 (sem vazar existencia)."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "naoexiste",
            "password": "Qualquer123",
        },
    )
    assert response.status_code == 401


# ========== GET ME ==========


def test_get_me_authenticated(client, admin_user, auth_headers):
    """GET /me com token valido retorna dados do usuario."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["email"] == "admin@lumina.com"
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
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "password": "NewAdmin456",
        },
    )
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


def test_change_password_revoga_sessao_antiga(client, admin_user, auth_headers):
    """
    Trocar a senha derruba a sessao que ja estava aberta.

    Esta e a propriedade de seguranca que o endpoint promete na resposta ("Faca login
    novamente com a nova senha") e que nao existia: o token nao carregava `iat`, entao
    `is_user_revoked()` nunca era alcancado e a sessao antiga sobrevivia ate o TTL.

    O `sleep` nao e enfeite: a revogacao e comparada com o `iat` do token, e `iat` tem
    resolucao de SEGUNDO. Sem cruzar a fronteira do segundo, emissao e revogacao caem no
    mesmo instante e o token antigo sobrevive por empate — janela real de ate 1s, aceita
    de proposito para nao derrubar o token novo emitido logo apos a troca.
    """
    import time

    # O token de `auth_headers` ja foi emitido pela fixture; cruzar a fronteira do segundo.
    time.sleep(1.1)

    response = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "Admin123", "new_password": "NewAdmin456"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    # O token ANTIGO tem de estar morto.
    me_antigo = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_antigo.status_code == 401, "sessao antiga sobreviveu a troca de senha"

    # E o token NOVO tem de funcionar — corrigir a revogacao nao pode trancar o usuario
    # para fora da propria conta.
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "NewAdmin456"},
    )
    assert login.status_code == 200
    novo = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=novo).status_code == 200


def test_logout_nao_derruba_outra_sessao(client, admin_user):
    """
    Sair de uma sessao nao pode derrubar as outras.

    Sem o claim `jti` o JWT era funcao deterministica de (sub, type, exp), e `exp` tem
    resolucao de segundo: dois logins do mesmo usuario no mesmo segundo produziam uma
    string identica. Revogar uma no logout revogava a outra junto.
    """
    credenciais = {"username": "admin", "password": "Admin123"}

    primeira = client.post("/api/v1/auth/login", json=credenciais).json()["access_token"]
    segunda = client.post("/api/v1/auth/login", json=credenciais).json()["access_token"]

    assert primeira != segunda, "dois logins geraram o mesmo token"

    assert client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {primeira}"}).status_code == 200

    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {primeira}"}).status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {segunda}"}).status_code == 200
