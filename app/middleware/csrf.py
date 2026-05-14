# app/middleware/csrf.py
"""
CSRF Protection Middleware

Proteção contra Cross-Site Request Forgery para endpoints críticos.

Nota: Como usamos JWT em headers (não cookies), o risco de CSRF é reduzido.
No entanto, mantemos proteção adicional para endpoints que modificam dados.
"""

import hashlib
import hmac
import secrets
from collections.abc import Callable

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware para proteção CSRF.

    Para APIs REST com JWT, CSRF é menos crítico (tokens não são cookies).
    Mas adicionamos proteção extra para endpoints de modificação.

    Endpoints protegidos: POST, PUT, DELETE, PATCH
    Exceções: /auth/login, /auth/register (precisam funcionar sem token)
    """

    # Endpoints que NÃO requerem CSRF token
    CSRF_EXEMPT_PATHS = [
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/health",
        "/health",
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    # Métodos HTTP que requerem CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

    def __init__(self, app, secret_key: str = None):
        super().__init__(app)
        self.secret_key = secret_key or settings.SECRET_KEY

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Processa request e verifica CSRF token quando necessário.
        """
        # Permitir métodos seguros (GET, HEAD, OPTIONS)
        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)

        # Verificar se path está na lista de exceções
        if self._is_exempt(request.url.path):
            return await call_next(request)

        # Para API REST com JWT, verificamos se há token de autenticação
        # Se houver JWT válido, consideramos seguro (não há cookie)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # JWT em header = sem risco de CSRF (browser não envia automaticamente)
            return await call_next(request)

        # Se não há JWT e está tentando modificar dados, bloquear
        # (previne ataques de sites maliciosos que tentam fazer requests)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed. Authentication required for data modification.",
        )

    def _is_exempt(self, path: str) -> bool:
        """Verifica se path está na lista de exceções"""
        return any(path.startswith(exempt) for exempt in self.CSRF_EXEMPT_PATHS)


def generate_csrf_token(secret_key: str = None) -> str:
    """
    Gera token CSRF para uso em forms (se necessário no futuro).

    Args:
        secret_key: Chave secreta para assinar token

    Returns:
        Token CSRF assinado
    """
    secret = secret_key or settings.SECRET_KEY
    token = secrets.token_urlsafe(32)

    # Assinar token com HMAC
    signature = hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()

    return f"{token}.{signature}"


def validate_csrf_token(token: str, secret_key: str = None) -> bool:
    """
    Valida token CSRF.

    Args:
        token: Token a ser validado
        secret_key: Chave secreta

    Returns:
        True se válido, False caso contrário
    """
    try:
        secret = secret_key or settings.SECRET_KEY
        token_value, signature = token.rsplit(".", 1)

        # Verificar assinatura
        expected_signature = hmac.new(secret.encode(), token_value.encode(), hashlib.sha256).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    except (ValueError, AttributeError):
        return False
