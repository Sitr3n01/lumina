# app/middleware/auth.py
"""
Middleware de autenticação JWT com Token Blacklist.
"""

from datetime import datetime

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.token_blacklist import get_token_blacklist
from app.database.session import get_db
from app.models.user import User

# Security scheme para Swagger UI
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)
) -> User:
    """
    Dependency para obter usuário atual autenticado.

    Args:
        credentials: Credenciais Bearer token do header Authorization
        db: Sessão do banco de dados

    Returns:
        User: Usuário autenticado

    Raises:
        HTTPException 401: Se token inválido ou usuário não encontrado
        HTTPException 403: Se usuário está inativo

    Usage:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user.username}
    """
    token = credentials.credentials

    # Verificar blacklist ANTES de decodificar (economiza processamento)
    blacklist = get_token_blacklist()
    if blacklist.is_revoked(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token foi revogado (logout ou senha alterada)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decodificar token
    try:
        payload = decode_access_token(token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    # Extrair user_id do payload
    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: user_id não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar se TODOS os tokens do usuário foram revogados
    token_issued_at = payload.get("iat")
    if token_issued_at and blacklist.is_user_revoked(int(user_id), datetime.fromtimestamp(token_issued_at)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token foi revogado (senha alterada)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Buscar usuário no banco
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar se usuário está ativo
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency para garantir que usuário está ativo.

    Args:
        current_user: Usuário atual (do get_current_user)

    Returns:
        User: Usuário ativo

    Raises:
        HTTPException 403: Se usuário está inativo
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
    return current_user


def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency para garantir que usuário é admin.

    Args:
        current_user: Usuário atual ativo

    Returns:
        User: Usuário admin

    Raises:
        HTTPException 403: Se usuário não é admin

    Usage:
        @app.delete("/admin/users/{user_id}")
        def delete_user(
            user_id: int,
            admin: User = Depends(get_current_admin_user)
        ):
            # Só admins podem deletar usuários
            ...
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permissão negada: apenas administradores")
    return current_user


def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """
    Dependency para rotas opcionalmente autenticadas.
    Retorna usuário se token presente e válido, None caso contrário.

    Args:
        request: Request do FastAPI
        db: Sessão do banco

    Returns:
        User ou None

    Usage:
        @app.get("/public-or-private")
        def mixed_route(user: Optional[User] = Depends(get_optional_current_user)):
            if user:
                return {"message": f"Olá {user.username}"}
            return {"message": "Olá visitante"}
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "")

    try:
        payload = decode_access_token(token)
        user_id: int | None = payload.get("sub")

        if user_id is None:
            return None

        user = db.query(User).filter(User.id == user_id).first()
        return user if user and user.is_active else None

    except HTTPException:
        return None
