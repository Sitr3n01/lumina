"""
Modelo CalendarSource - Representa uma fonte de calendário iCal (Airbnb, Booking, etc).
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.property import Property


class PlatformType(enum.StrEnum):
    """Tipos de plataforma de reserva"""

    AIRBNB = "airbnb"
    BOOKING = "booking"
    MANUAL = "manual"
    OTHER = "other"


class CalendarSource(BaseModel):
    """Modelo de fonte de calendário iCal"""

    __tablename__ = "calendar_sources"

    # Relacionamento com Property
    property_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, comment="ID do imóvel associado"
    )

    # Informações da fonte
    platform: Mapped[PlatformType] = mapped_column(
        SQLEnum(PlatformType), nullable=False, comment="Plataforma de origem (airbnb/booking/manual)"
    )

    ical_url: Mapped[str] = mapped_column(String(1000), nullable=False, comment="URL do feed iCal")

    # Configurações de sincronização
    sync_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, comment="Se a sincronização está ativa"
    )

    sync_frequency_minutes: Mapped[int] = mapped_column(
        Integer, default=30, nullable=False, comment="Frequência de sincronização em minutos"
    )

    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, comment="Data da última sincronização bem-sucedida"
    )

    last_sync_status: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Status da última sincronização (success/error/partial)"
    )

    # Relacionamentos (não usar 'property' como nome - conflita com @property decorator)
    property_rel: Mapped["Property"] = relationship("Property", back_populates="calendar_sources")

    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="calendar_source", lazy="select")

    def __repr__(self) -> str:
        return f"<CalendarSource(id={self.id}, platform='{self.platform.value}', property_id={self.property_id})>"
