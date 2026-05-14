"""
Modelo para notificações do sistema.
Armazena todos os eventos relevantes para exibição na Central de Notificações.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class NotificationType(enum.StrEnum):
    """Tipos de notificação do sistema"""

    NEW_BOOKING = "new_booking"
    BOOKING_UPDATE = "booking_update"
    BOOKING_CANCEL = "booking_cancel"
    CONFLICT = "conflict"
    SYNC = "sync"
    DOCUMENT = "document"
    EMAIL = "email"
    SYSTEM = "system"


class Notification(BaseModel):
    """
    Notificação do sistema.
    Registra eventos como novas reservas, conflitos, sincronizações,
    documentos gerados e emails enviados.
    """

    __tablename__ = "notifications"

    type: Mapped[str] = mapped_column(
        String(30), nullable=False, comment="Tipo da notificação (new_booking, conflict, sync, etc.)"
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="Título curto da notificação")

    message: Mapped[str] = mapped_column(Text, nullable=False, default="", comment="Descrição detalhada do evento")

    booking_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        comment="ID da reserva relacionada (se aplicável)",
    )

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="Se a notificação foi lida")

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="Data/hora em que foi marcada como lida"
    )

    __table_args__ = (
        Index("idx_notifications_is_read_created", "is_read", "created_at"),
        Index("idx_notifications_type", "type"),
        Index("idx_notifications_booking", "booking_id"),
    )

    def __repr__(self) -> str:
        status = "read" if self.is_read else "unread"
        return f"<Notification(id={self.id}, type='{self.type}', status='{status}')>"
