"""
Modelo SyncAction - Registra ações de sincronização entre plataformas.
Usado para rastrear bloqueios que precisam ser aplicados manualmente.
"""

import enum
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.property import Property


class ActionType(enum.StrEnum):
    """Tipos de ação de sincronização"""

    BLOCK_DATES = "block_dates"  # Bloquear datas em plataforma
    UNBLOCK_DATES = "unblock_dates"  # Desbloquear datas
    CANCEL_BOOKING = "cancel_booking"  # Cancelar reserva
    UPDATE_PRICE = "update_price"  # Atualizar preço (futuro)


class ActionStatus(enum.StrEnum):
    """Status da ação"""

    PENDING = "pending"  # Aguardando ação manual
    COMPLETED = "completed"  # Ação confirmada manualmente
    DISMISSED = "dismissed"  # Usuário decidiu não fazer
    EXPIRED = "expired"  # Ação não mais necessária


class TargetPlatform(enum.StrEnum):
    """Plataforma alvo da ação"""

    AIRBNB = "airbnb"
    BOOKING = "booking"
    BOTH = "both"


class SyncAction(Base):
    """Modelo de ação de sincronização entre plataformas"""

    __tablename__ = "sync_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Relacionamentos
    property_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, comment="ID do imóvel"
    )

    trigger_booking_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        comment="Reserva que originou a ação (se aplicável)",
    )

    # Tipo e status
    action_type: Mapped[ActionType] = mapped_column(
        SQLEnum(ActionType), nullable=False, comment="Tipo de ação a ser executada"
    )

    status: Mapped[ActionStatus] = mapped_column(
        SQLEnum(ActionStatus), nullable=False, default=ActionStatus.PENDING, comment="Status da ação"
    )

    target_platform: Mapped[TargetPlatform] = mapped_column(
        SQLEnum(TargetPlatform), nullable=False, comment="Plataforma onde executar ação"
    )

    # Dados da ação
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="Data inicial (para bloqueios)")

    end_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="Data final (para bloqueios)")

    reason: Mapped[str] = mapped_column(Text, nullable=False, comment="Motivo da ação (exibido ao usuário)")

    # Links diretos para facilitar ação manual
    action_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="URL direta para executar ação (se possível)"
    )

    # Prioridade
    priority: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False, comment="Prioridade (low/medium/high/critical)"
    )

    # Auto-dismiss (para ações que expiram)
    auto_dismiss_after_hours: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Horas até auto-descartar (None = não expira)"
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC).replace(tzinfo=None),
        comment="Quando a ação foi criada",
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="Quando foi marcada como concluída"
    )

    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="Quando foi descartada")

    # Notas do usuário
    user_notes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Notas adicionadas pelo usuário")

    # Relacionamentos (não usar 'property' como nome - conflita com @property decorator)
    property_rel: Mapped["Property"] = relationship("Property", lazy="selectin")

    trigger_booking: Mapped["Booking"] = relationship("Booking", foreign_keys=[trigger_booking_id], lazy="selectin")

    def __repr__(self) -> str:
        return f"<SyncAction(id={self.id}, type='{self.action_type.value}', status='{self.status.value}', platform='{self.target_platform.value}')>"

    @property
    def is_pending(self) -> bool:
        """Verifica se a ação está pendente"""
        return self.status == ActionStatus.PENDING

    @property
    def is_completed(self) -> bool:
        """Verifica se a ação foi completada"""
        return self.status == ActionStatus.COMPLETED

    @property
    def should_auto_dismiss(self) -> bool:
        """Verifica se a ação deve ser auto-descartada"""
        if not self.auto_dismiss_after_hours or self.status != ActionStatus.PENDING:
            return False

        hours_elapsed = (datetime.now(UTC).replace(tzinfo=None) - self.created_at).total_seconds() / 3600
        return hours_elapsed >= self.auto_dismiss_after_hours

    @property
    def priority_emoji(self) -> str:
        """Retorna emoji baseado na prioridade"""
        priority_emojis = {"low": "ℹ️", "medium": "⚠️", "high": "🔴", "critical": "🚨"}
        return priority_emojis.get(self.priority, "ℹ️")

    def mark_completed(self, notes: str = None) -> None:
        """Marca a ação como completada"""
        self.status = ActionStatus.COMPLETED
        self.completed_at = datetime.now(UTC).replace(tzinfo=None)
        if notes:
            self.user_notes = notes

    def mark_dismissed(self, notes: str = None) -> None:
        """Marca a ação como descartada"""
        self.status = ActionStatus.DISMISSED
        self.dismissed_at = datetime.now(UTC).replace(tzinfo=None)
        if notes:
            self.user_notes = notes

    def get_action_description(self) -> str:
        """Retorna descrição amigável da ação"""
        if self.action_type == ActionType.BLOCK_DATES:
            platform_name = {
                TargetPlatform.AIRBNB: "Airbnb",
                TargetPlatform.BOOKING: "Booking.com",
                TargetPlatform.BOTH: "Airbnb e Booking",
            }[self.target_platform]

            dates = f"{self.start_date.strftime('%d/%m')} a {self.end_date.strftime('%d/%m/%Y')}"
            return f"🔒 Bloquear {dates} no {platform_name}"

        elif self.action_type == ActionType.CANCEL_BOOKING:
            return f"🚫 Cancelar reserva no {self.target_platform.value.title()}"

        return f"Ação: {self.action_type.value}"
