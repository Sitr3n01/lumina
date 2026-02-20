# app/schemas/auth.py
"""
Schemas Pydantic para autenticação e usuários.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_password_strength(v: str) -> str:
    """
    Valida a força da senha. Regras:
    - Mínimo 8 caracteres
    - Pelo menos 1 letra maiúscula
    - Pelo menos 1 letra minúscula
    - Pelo menos 1 número
    """
    if len(v) < 8:
        raise ValueError('Senha deve ter no mínimo 8 caracteres')

    has_upper = any(c.isupper() for c in v)
    has_lower = any(c.islower() for c in v)
    has_digit = any(c.isdigit() for c in v)

    if not (has_upper and has_lower and has_digit):
        raise ValueError('Senha deve conter pelo menos: 1 maiúscula, 1 minúscula e 1 número')

    return v


# === TOKEN SCHEMAS ===

class Token(BaseModel):
    """Schema para resposta de token JWT"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Dados decodificados do token"""
    user_id: Optional[int] = None
    email: Optional[str] = None
    username: Optional[str] = None


# === USER SCHEMAS ===

class UserBase(BaseModel):
    """
    Base schema para usuário.

    SECURITY NOTE: Este schema contém APENAS campos que usuários podem fornecer.
    Campos privilegiados (is_admin, is_active, failed_login_attempts, locked_until)
    NUNCA devem ser adicionados aqui.
    """
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=200)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Valida username (apenas letras, números e underscore)"""
        if not v.replace('_', '').isalnum():
            raise ValueError('Username deve conter apenas letras, números e underscore')
        return v.lower()


class UserCreate(UserBase):
    """Schema para criação de usuário"""
    password: str = Field(..., min_length=8, max_length=100)

    # SECURITY FIX: Prevenir mass assignment
    model_config = {"extra": "forbid"}  # Rejeitar campos extras

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Valida força da senha"""
        return _validate_password_strength(v)


class UserUpdate(BaseModel):
    """Schema para atualização de usuário"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=200)
    password: Optional[str] = Field(None, min_length=8, max_length=100)


class UserInDB(UserBase):
    """Schema para usuário no banco (com ID)"""
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Permite criar from ORM models


class UserResponse(UserInDB):
    """Schema para resposta de API (sem dados sensíveis)"""
    pass


# === LOGIN SCHEMAS ===

class LoginRequest(BaseModel):
    """Schema para request de login"""
    username: str = Field(..., description="Username ou email")
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Schema para resposta de login"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# === CHANGE PASSWORD ===

class ChangePasswordRequest(BaseModel):
    """Schema para mudança de senha"""
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Valida nova senha"""
        return _validate_password_strength(v)


class DeleteAccountRequest(BaseModel):
    """Schema para deleção de conta (senha via body, não query param)"""
    password: str = Field(..., min_length=1, description="Senha para confirmação")
