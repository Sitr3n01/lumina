# app/core/security.py
"""
Módulo de segurança: Autenticação, hashing de senhas e geração de tokens JWT.
"""

import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import settings

# Configurações JWT - centralizadas via settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = getattr(settings, "JWT_ALGORITHM", "HS256")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha fornecida corresponde ao hash armazenado.

    Args:
        plain_password: Senha em texto plano
        hashed_password: Hash da senha armazenado no banco

    Returns:
        True se a senha corresponde, False caso contrário
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """
    Gera hash bcrypt da senha.

    Args:
        password: Senha em texto plano

    Returns:
        Hash da senha
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Cria token JWT de acesso.

    Args:
        data: Dados a serem codificados no token (ex: {"sub": "user_id"})
        expires_delta: Tempo de expiração customizado (opcional)

    Returns:
        Token JWT como string

    Example:
        >>> token = create_access_token({"sub": "123", "email": "user@example.com"})
    """
    to_encode = data.copy()

    agora = datetime.now(UTC).replace(tzinfo=None)

    janela = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = agora + janela

    # `jti` e `iat` NÃO são decorativos — cada um sustenta um mecanismo de revogação.
    #
    # `jti`: sem ele o token é uma função determinística de (sub, type, exp), e `exp`
    # tem resolução de SEGUNDO. Dois logins do mesmo usuário no mesmo segundo geravam
    # uma string JWT byte a byte idêntica, então revogar uma sessão no logout derrubava
    # junto qualquer outra sessão aberta naquele segundo. A blacklist indexa pelo token
    # inteiro; o `jti` é o que torna esse índice de fato único por sessão.
    #
    # `iat`: é o único dado que permite a `is_user_revoked()` distinguir um token emitido
    # ANTES da troca de senha de um emitido DEPOIS. Sem ele o middleware lia `None`,
    # a condição fazia curto-circuito, e `revoke_all_user_tokens()` não revogava nada —
    # trocar a senha deixava a sessão antiga viva até o TTL inteiro expirar.
    to_encode.update(
        {
            "exp": expire,
            "iat": agora,
            "jti": secrets.token_urlsafe(16),
        }
    )
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decodifica e valida token JWT.

    Args:
        token: Token JWT

    Returns:
        Payload do token (dict)

    Raises:
        HTTPException: Se token for inválido ou expirado
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None


def verify_token(token: str) -> str | None:
    """
    Verifica token e retorna o subject (user_id).

    Args:
        token: Token JWT

    Returns:
        User ID (subject) se válido, None caso contrário
    """
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except HTTPException:
        return None
