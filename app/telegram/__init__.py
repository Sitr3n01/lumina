"""
Módulo do bot Telegram para notificações e gerenciamento.
"""

from .bot import TelegramBot
from .notifications import NotificationService

__all__ = ["NotificationService", "TelegramBot"]
