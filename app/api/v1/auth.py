# app/api/v1/auth.py
"""
Endpoints de autenticação: login, registro, mudança de senha.
"""
from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.config import settings
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserResponse,
    ChangePasswordRequest,
    DeleteAccountRequest,
    Token
)
from app.middleware.auth import get_current_user, get_current_active_user, get_current_admin_user
from app.core.token_blacklist import get_token_blacklist

router = APIRouter(prefix="/auth", tags=["Autenticação"])
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")  # Máximo 3 registros por minuto
def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Registra novo usuário no sistema.

    Só é permitido se nenhum usuário existir (primeiro setup).
    Após o primeiro usuário ser criado, o registro é fechado.

    Validações:
    - Sistema sem usuários (primeiro setup)
    - Email único
    - Username único
    - Senha forte (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número)

    Returns:
        UserResponse: Dados do usuário criado (sem senha)
    """
    # Verificar se já existe algum usuário no sistema (invite-only após primeiro setup)
    user_count = db.query(User).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registro de novos usuários não permitido. Sistema já configurado."
        )

    # Verificar se email já existe
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )

    # Verificar se username já existe
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username já cadastrado"
        )

    # Criar usuário
    hashed_password = get_password_hash(user_data.password)

    # SECURITY FIX: Criar usuário com campos explícitos para prevenir mass assignment
    # NUNCA usar **user_data.dict() ou similar que possa incluir campos extras
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        # CRITICAL: Sempre definir explicitamente campos de privilégio
        is_active=True,
        is_admin=True,  # Primeiro (e único) usuário é automaticamente admin
        # CRITICAL: Garantir que failed_login_attempts inicia em 0
        failed_login_attempts=0,
        locked_until=None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    """
    Verifica se o sistema precisa de configuração inicial (sem autenticação).
    Retorna true se não há nenhum usuário cadastrado ainda.
    """
    needs_setup = db.query(User).count() == 0
    return {"needs_setup": needs_setup}


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # Máximo 5 tentativas de login por minuto
def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Autentica usuário e retorna token JWT.

    Args:
        login_data: Username/email e senha

    Returns:
        LoginResponse: Token JWT e dados do usuário

    Raises:
        HTTPException 401: Se credenciais inválidas
    """
    # Buscar por username ou email
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()

    # PROTEÇÃO CONTRA ACCOUNT LOCKOUT:
    # Verificar se conta está bloqueada (antes da verificação de senha)
    if user and user.locked_until:
        if datetime.now(timezone.utc).replace(tzinfo=None) < user.locked_until:
            # Conta ainda está bloqueada
            remaining = (user.locked_until - datetime.now(timezone.utc).replace(tzinfo=None)).total_seconds() / 60
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Conta bloqueada temporariamente. Tente novamente em {int(remaining)} minutos."
            )
        else:
            # Período de bloqueio expirou - resetar contadores
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # PROTEÇÃO CONTRA TIMING ATTACK:
    # Sempre executa hash verification, mesmo se usuário não existir
    # Isso garante tempo de resposta constante
    dummy_hash = "$2b$12$dummyhashfordummyhashfordummyhashfordummyhashfordummyha"
    password_hash = user.hashed_password if user else dummy_hash

    # Verifica senha
    password_valid = verify_password(login_data.password, password_hash)

    # Verificar se usuário existe E senha correta
    if not user or not password_valid:
        # Incrementar contador de tentativas falhas
        if user:
            user.failed_login_attempts += 1

            # Bloquear conta após 5 tentativas (15 minutos de bloqueio)
            MAX_ATTEMPTS = 5
            LOCKOUT_MINUTES = 15

            if user.failed_login_attempts >= MAX_ATTEMPTS:
                user.locked_until = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=LOCKOUT_MINUTES)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Muitas tentativas de login. Conta bloqueada por {LOCKOUT_MINUTES} minutos."
                )

            db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username/email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificar se usuário está ativo
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Entre em contato com o administrador."
        )

    # Login bem-sucedido - resetar contador de tentativas
    user.failed_login_attempts = 0
    user.locked_until = None

    # Atualizar last_login
    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    # Criar token JWT - APENAS ID DO USUÁRIO
    # Dados sensíveis (email, username, is_admin) são buscados do banco via middleware
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),  # Apenas ID do usuário
            "type": "access",     # Tipo do token
        },
        expires_delta=access_token_expires
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna informações do usuário atualmente autenticado.

    Requer: Token JWT válido no header Authorization

    Returns:
        UserResponse: Dados do usuário atual
    """
    return current_user


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Altera senha do usuário autenticado.

    Args:
        password_data: Senha antiga e nova senha
        current_user: Usuário autenticado (automático via token)

    Returns:
        dict: Mensagem de sucesso

    Raises:
        HTTPException 400: Se senha antiga incorreta
    """
    # Verificar senha antiga
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )

    # Verificar se nova senha é diferente
    if password_data.old_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nova senha deve ser diferente da atual"
        )

    # Atualizar senha
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    # REVOGAR TODOS os tokens do usuário (segurança)
    # Usuário precisará fazer login novamente com nova senha
    blacklist = get_token_blacklist()
    token_exp = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    blacklist.revoke_all_user_tokens(current_user.id, token_exp)

    return {
        "message": "Senha alterada com sucesso. Faça login novamente com a nova senha."
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_active_user)
):
    """
    Logout do usuário com invalidação server-side do token.

    Adiciona token atual à blacklist (Redis ou in-memory).
    Token não poderá ser reutilizado até expiração natural.

    Returns:
        dict: Mensagem de sucesso
    """
    token = credentials.credentials

    # Adicionar token à blacklist
    blacklist = get_token_blacklist()
    token_exp = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    blacklist.revoke_token(token, token_exp)

    return {"message": "Logout realizado com sucesso. Token invalidado."}


@router.delete("/delete-account", status_code=status.HTTP_200_OK)
def delete_account(
    request_data: DeleteAccountRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Deleta conta do usuário autenticado (IRREVERSÍVEL).

    Args:
        request_data: Body com senha para confirmação

    Returns:
        dict: Mensagem de sucesso

    Raises:
        HTTPException 400: Se senha incorreta
    """
    # Verificar senha
    if not verify_password(request_data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha incorreta"
        )

    # Deletar usuário
    db.delete(current_user)
    db.commit()

    return {"message": "Conta deletada com sucesso"}


@router.post("/unlock-user/{user_id}", status_code=status.HTTP_200_OK)
def unlock_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """
    Desbloqueia usuário manualmente (APENAS ADMIN).

    Args:
        user_id: ID do usuário a ser desbloqueado
        admin: Usuário administrador (automático via token)

    Returns:
        dict: Mensagem de sucesso

    Raises:
        HTTPException 404: Se usuário não encontrado
    """
    # Buscar usuário
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Desbloquear e resetar contadores
    user.locked_until = None
    user.failed_login_attempts = 0
    db.commit()

    return {
        "message": f"Usuário {user.username} desbloqueado com sucesso",
        "user_id": user.id,
        "username": user.username
    }
