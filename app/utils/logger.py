"""
Sistema de logging centralizado usando Loguru.
Logs técnicos em inglês, mensagens de usuário em português.
Inclui sanitização automática de dados sensíveis (tokens, senhas, URLs).
"""
import re
import sys
from pathlib import Path
from loguru import logger


# Padrões sensíveis para redação em logs
_SENSITIVE_PATTERNS = [
    # Tokens em query strings: ?token=xxx ou &token=xxx
    (re.compile(r'([\?&](?:token|key|secret|password|api_key|access_token|apikey|auth)=)[^&\s"\']+', re.IGNORECASE), r'\1[REDACTED]'),
    # URLs iCal com tokens longos (ex: /ical/ABC123DEF456.ics)
    (re.compile(r'(/ical/)[A-Za-z0-9_-]{20,}(\.ics)'), r'\1[REDACTED]\2'),
    # Bearer tokens em headers
    (re.compile(r'(Bearer\s+)[A-Za-z0-9._-]{20,}', re.IGNORECASE), r'\1[REDACTED]'),
    # Senhas em strings de conexão (user:password@host)
    (re.compile(r'(://[^:]+:)[^@]+(@)'), r'\1[REDACTED]\2'),
]


def sanitize_log_message(message: str) -> str:
    """Remove tokens, senhas e dados sensíveis de mensagens de log."""
    for pattern, replacement in _SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


def _sanitizing_format_console(record):
    """Formata mensagem de console com sanitização."""
    record["extra"]["sanitized_message"] = sanitize_log_message(record["message"])
    return (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{extra[sanitized_message]}</level>\n{exception}"
    )


def _sanitizing_format_file(record):
    """Formata mensagem de arquivo com sanitização."""
    record["extra"]["sanitized_message"] = sanitize_log_message(record["message"])
    return (
        "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
        "{name}:{function}:{line} - {extra[sanitized_message]}\n{exception}"
    )


def setup_logger(log_level: str = "INFO", app_name: str = "Lumina") -> None:
    """
    Configura o logger da aplicação.

    Args:
        log_level: Nível de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        app_name: Nome da aplicação para o arquivo de log
    """
    # Garantir encoding UTF-8 no stdout para evitar UnicodeEncodeError no Windows (CP1252)
    # Usa errors='replace' como fallback: caracteres incodificáveis viram '?' em vez de crash
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    # Remove handlers padrão do loguru
    logger.remove()

    # Console handler - formatação colorida e legível (com sanitização)
    logger.add(
        sys.stdout,
        format=_sanitizing_format_console,
        level=log_level,
        colorize=True,
    )

    # File handler - logs rotacionados diariamente (com sanitização)
    log_path = Path("data/logs")
    log_path.mkdir(parents=True, exist_ok=True)

    logger.add(
        log_path / f"{app_name.lower()}_{{time:YYYY-MM-DD}}.log",
        format=_sanitizing_format_file,
        level=log_level,
        rotation="00:00",  # Novo arquivo à meia-noite
        retention="30 days",  # Mantém logs por 30 dias
        compression="zip",  # Comprime logs antigos
        encoding="utf-8",
    )

    # File handler para erros - arquivo separado (com sanitização)
    logger.add(
        log_path / f"{app_name.lower()}_errors_{{time:YYYY-MM-DD}}.log",
        format=_sanitizing_format_file,
        level="ERROR",
        rotation="00:00",
        retention="90 days",  # Mantém logs de erro por mais tempo
        compression="zip",
        encoding="utf-8",
        backtrace=True,  # Inclui traceback completo
        diagnose=True,  # Informações de diagnóstico detalhadas
    )

    logger.info(f"Logger initialized - Level: {log_level}, App: {app_name}")


def get_logger(name: str = None):
    """
    Retorna uma instância do logger.

    Args:
        name: Nome do módulo/componente (opcional)

    Returns:
        Logger instance
    """
    if name:
        return logger.bind(name=name)
    return logger


# Logger padrão da aplicação
app_logger = logger
