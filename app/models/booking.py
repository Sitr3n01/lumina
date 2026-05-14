"""
Modelo Booking - Representa uma reserva no sistema.
"""

import enum
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.calendar_source import CalendarSource
    from app.models.guest import Guest
    from app.models.property import Property


class BookingStatus(enum.StrEnum):
    """Status possíveis de uma reserva"""

    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    BLOCKED = "blocked"  # Bloqueio manual


class Booking(BaseModel):
    """Modelo de reserva"""

    __tablename__ = "bookings"

    __table_args__ = (
        # Índice para queries de reservas confirmadas por propriedade e data
        Index("idx_property_status_checkin", "property_id", "status", "check_in_date"),
        # Índice para queries de conflitos e sobreposição de datas
        Index("idx_property_dates", "property_id", "check_in_date", "check_out_date"),
        # Índice para busca por plataforma e status
        Index("idx_property_platform", "property_id", "platform", "status"),
    )

    # Relacionamentos
    property_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, comment="ID do imóvel"
    )

    calendar_source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("calendar_sources.id", ondelete="SET NULL"),
        nullable=True,
        comment="ID da fonte do calendário",
    )

    guest_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("guests.id", ondelete="SET NULL"), nullable=True, comment="ID do hóspede (se vinculado)"
    )

    # Identificação externa
    external_id: Mapped[str | None] = mapped_column(
        String(200), nullable=True, index=True, comment="ID da reserva na plataforma externa"
    )

    platform: Mapped[str] = mapped_column(
        String(50), nullable=False, default="manual", comment="Plataforma de origem (airbnb/booking/manual)"
    )

    # Status
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus), nullable=False, default=BookingStatus.CONFIRMED, comment="Status da reserva"
    )

    # Datas
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, comment="Data de check-in")

    check_out_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, comment="Data de check-out")

    nights_count: Mapped[int] = mapped_column(Integer, nullable=False, comment="Número de noites")

    # Informações do hóspede (desnormalizadas para facilitar queries)
    guest_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="Nome do hóspede principal")

    guest_email: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Email do hóspede")

    guest_phone: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Telefone do hóspede")

    guest_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False, comment="Número de hóspedes")

    # Valores financeiros
    total_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True, comment="Valor total da reserva")

    currency: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False, comment="Moeda (ISO 4217)")

    # Dados brutos para auditoria
    raw_ical_data: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Dados brutos do evento iCal (JSON)")

    raw_email_data: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Dados brutos do email (JSON) - MVP3"
    )

    # Relacionamentos (não usar 'property' como nome - conflita com @property decorator)
    property_rel: Mapped["Property"] = relationship("Property", back_populates="bookings")

    calendar_source: Mapped["CalendarSource"] = relationship("CalendarSource", back_populates="bookings")

    guest: Mapped["Guest"] = relationship("Guest", back_populates="bookings", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Booking(id={self.id}, guest='{self.guest_name}', check_in={self.check_in_date}, check_out={self.check_out_date})>"

    @property
    def duration_nights(self) -> int:
        """Calcula a duração da reserva em noites"""
        return (self.check_out_date - self.check_in_date).days

    def overlaps_with(self, other_check_in: date, other_check_out: date) -> bool:
        """
        Verifica se esta reserva se sobrepõe a um período de datas.

        Args:
            other_check_in: Data de check-in a comparar
            other_check_out: Data de check-out a comparar

        Returns:
            True se há sobreposição, False caso contrário
        """
        # Sobreposição ocorre se:
        # 1. O check-in está dentro do período OU
        # 2. O check-out está dentro do período OU
        # 3. O período está completamente contido na reserva
        return self.check_in_date < other_check_out and self.check_out_date > other_check_in
