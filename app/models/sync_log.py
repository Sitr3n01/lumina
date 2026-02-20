"""
Modelo SyncLog - Registra histórico de sincronizações de calendários.
"""
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.calendar_source import CalendarSource


class SyncType(str, enum.Enum):
    """Tipos de sincronização"""
    ICAL = "ical"
    EMAIL = "email"
    MANUAL = "manual"


class SyncStatus(str, enum.Enum):
    """Status de sincronização"""
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


class SyncLog(Base):
    """Modelo de log de sincronização"""

    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    # Relacionamento
    calendar_source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("calendar_sources.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID da fonte do calendário"
    )

    # Tipo e status
    sync_type: Mapped[SyncType] = mapped_column(
        SQLEnum(SyncType),
        nullable=False,
        default=SyncType.ICAL,
        comment="Tipo de sincronização"
    )

    status: Mapped[SyncStatus] = mapped_column(
        SQLEnum(SyncStatus),
        nullable=False,
        comment="Status da sincronização"
    )

    # Estatísticas
    bookings_added: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Número de reservas adicionadas"
    )

    bookings_updated: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Número de reservas atualizadas"
    )

    bookings_cancelled: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Número de reservas canceladas"
    )

    conflicts_detected: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Número de conflitos detectados"
    )

    # Detalhes técnicos
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Mensagem de erro (se houver)"
    )

    sync_duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Duração da sincronização em milissegundos"
    )

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        comment="Início da sincronização"
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Fim da sincronização"
    )

    # Relacionamentos
    calendar_source: Mapped["CalendarSource"] = relationship(
        "CalendarSource",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<SyncLog(id={self.id}, status='{self.status.value}', started_at={self.started_at})>"

    @property
    def total_changes(self) -> int:
        """Total de mudanças detectadas"""
        return self.bookings_added + self.bookings_updated + self.bookings_cancelled

    @property
    def was_successful(self) -> bool:
        """Verifica se a sincronização foi bem-sucedida"""
        return self.status == SyncStatus.SUCCESS
