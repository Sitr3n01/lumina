# app/core/security.py
"""
Módulo de segurança: Autenticação, hashing de senhas e geração de tokens JWT.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.config import settings

# Configurações JWT - centralizadas via settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = getattr(settings, 'JWT_ALGORITHM', 'HS256')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica se a senha fornecida corresponde ao hash armazenado.

    Args:
        plain_password: Senha em texto plano
        hashed_password: Hash da senha armazenado no banco

    Returns:
        True se a senha corresponde, False caso contrário
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """
    Gera hash bcrypt da senha.

    Args:
        password: Senha em texto plano

    Returns:
        Hash da senha
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
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

    if expires_delta:
        expire = datetime.now(timezone.utc).replace(tzinfo=None) + expires_delta
    else:
        expire = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
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
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token(token: str) -> Union[str, None]:
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
