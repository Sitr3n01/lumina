# app/core/environments.py
"""
Configurações específicas por ambiente (dev, staging, prod).
"""

from enum import StrEnum
from typing import Any


class Environment(StrEnum):
    """Ambientes disponíveis"""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class EnvironmentConfig:
    """
    Configurações específicas por ambiente.
    Sobrescreve valores padrão do Settings conforme o ambiente.
    """

    @staticmethod
    def get_config(env: str) -> dict[str, Any]:
        """
        Retorna configurações específicas do ambiente.

        Args:
            env: Nome do ambiente (development, staging, production)

        Returns:
            Dict com configurações do ambiente
        """
        configs = {
            Environment.DEVELOPMENT: {
                "LOG_LEVEL": "DEBUG",
                "RATE_LIMIT_ENABLED": False,
                "CORS_ORIGINS": "http://localhost:3000,http://localhost:5173,http://localhost:8080",
                "ACCESS_TOKEN_EXPIRE_MINUTES": 60,  # 1 hora em dev
                "ENABLE_CONFLICT_NOTIFICATIONS": False,
            },
            Environment.STAGING: {
                "LOG_LEVEL": "INFO",
                "RATE_LIMIT_ENABLED": True,
                "RATE_LIMIT_PER_MINUTE": 100,
                "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
                "ENABLE_CONFLICT_NOTIFICATIONS": True,
            },
            Environment.PRODUCTION: {
                "LOG_LEVEL": "WARNING",
                "RATE_LIMIT_ENABLED": True,
                "RATE_LIMIT_PER_MINUTE": 60,
                "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
                "ENABLE_CONFLICT_NOTIFICATIONS": True,
            },
        }

        env_key = Environment(env) if env in [e.value for e in Environment] else Environment.PRODUCTION
        return configs.get(env_key, configs[Environment.PRODUCTION])

    @staticmethod
    def get_security_config(env: str) -> dict[str, Any]:
        """
        Configurações de segurança específicas por ambiente.

        Args:
            env: Nome do ambiente

        Returns:
            Dict com configurações de segurança
        """
        if env == Environment.DEVELOPMENT:
            return {
                "HTTPS_REQUIRED": False,
                "SECURE_COOKIES": False,
                "HSTS_ENABLED": False,
                "CSP_ENABLED": False,
            }

        elif env == Environment.STAGING:
            return {
                "HTTPS_REQUIRED": True,
                "SECURE_COOKIES": True,
                "HSTS_ENABLED": True,
                "CSP_ENABLED": True,
                "HSTS_MAX_AGE": 2592000,  # 30 dias
            }

        else:  # PRODUCTION
            return {
                "HTTPS_REQUIRED": True,
                "SECURE_COOKIES": True,
                "HSTS_ENABLED": True,
                "CSP_ENABLED": True,
                "HSTS_MAX_AGE": 31536000,  # 1 ano
                "HSTS_INCLUDE_SUBDOMAINS": True,
                "HSTS_PRELOAD": True,
            }
