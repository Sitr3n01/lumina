# app/middleware/security_headers.py
"""
Middleware para adicionar headers de segurança nas respostas HTTP.
Protege contra ataques XSS, clickjacking, MIME sniffing, etc.
"""

from collections.abc import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings
from app.core.environments import EnvironmentConfig


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adiciona headers de segurança em todas as respostas.

    Headers implementados:
    - X-Content-Type-Options: Previne MIME sniffing
    - X-Frame-Options: Previne clickjacking
    - X-XSS-Protection: Proteção XSS legada
    - Strict-Transport-Security: Força HTTPS
    - Content-Security-Policy: Política de conteúdo
    - Referrer-Policy: Controla informações de referência
    - Permissions-Policy: Controla features do browser
    """

    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.security_config = EnvironmentConfig.get_security_config(environment)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Processa request e adiciona headers de segurança na response.

        Args:
            request: Request HTTP
            call_next: Próximo middleware/handler

        Returns:
            Response com headers de segurança
        """
        response = await call_next(request)

        # X-Content-Type-Options: Previne MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-Frame-Options: Previne clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # X-XSS-Protection: Proteção XSS (legado, mas ainda útil)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy: Controla informações de referência
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy: Desabilita features desnecessárias
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # HSTS (HTTP Strict Transport Security) - apenas em produção
        if self.security_config.get("HSTS_ENABLED", False):
            hsts_value = f"max-age={self.security_config.get('HSTS_MAX_AGE', 31536000)}"

            if self.security_config.get("HSTS_INCLUDE_SUBDOMAINS", False):
                hsts_value += "; includeSubDomains"

            if self.security_config.get("HSTS_PRELOAD", False):
                hsts_value += "; preload"

            response.headers["Strict-Transport-Security"] = hsts_value

        # Content-Security-Policy (CSP)
        if self.security_config.get("CSP_ENABLED", False):
            # Verificar se é rota do Swagger/docs (precisa de unsafe-inline para scripts)
            is_docs_route = request.url.path in ("/docs", "/redoc", "/openapi.json")

            if is_docs_route:
                # CSP relaxada para Swagger UI (apenas nas rotas de docs)
                csp_directives = [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                    "img-src 'self' data: https://fastapi.tiangolo.com",
                    "font-src 'self' data:",
                    "connect-src 'self'",
                    "frame-ancestors 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                ]
            else:
                # CSP rígida para o app (sem unsafe-inline em scripts, sem unsafe-eval)
                csp_directives = [
                    "default-src 'self'",
                    "script-src 'self'",
                    "style-src 'self' 'unsafe-inline'",  # Vite/React usa inline styles
                    "img-src 'self' data:",
                    "font-src 'self' data:",
                    "connect-src 'self'",
                    "frame-ancestors 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "object-src 'none'",
                ]

            response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        return response


def add_security_headers(app, environment: str = None):
    """
    Helper function para adicionar middleware de security headers.

    Args:
        app: FastAPI application
        environment: Nome do ambiente (development, staging, production)

    Usage:
        from app.middleware.security_headers import add_security_headers
        add_security_headers(app, environment="production")
    """
    env = environment or settings.APP_ENV
    app.add_middleware(SecurityHeadersMiddleware, environment=env)
