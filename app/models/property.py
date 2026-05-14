"""
Modelo Property - Representa um imóvel gerenciado pelo sistema.
"""

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.calendar_source import CalendarSource


class Property(BaseModel):
    """Modelo de imóvel/apartamento"""

    __tablename__ = "properties"

    # Informações básicas
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Nome do imóvel (ex: Apartamento T2 - Centro)"
    )

    address: Mapped[str] = mapped_column(String(500), nullable=False, comment="Endereço completo do imóvel")

    # Capacidade
    max_guests: Mapped[int] = mapped_column(
        Integer, default=4, nullable=False, comment="Número máximo de hóspedes permitidos"
    )

    # Informações do condomínio
    condo_name: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Nome do condomínio")

    condo_admin_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="Nome da administração do condomínio"
    )

    # Relacionamentos
    calendar_sources: Mapped[list["CalendarSource"]] = relationship(
        "CalendarSource", back_populates="property_rel", cascade="all, delete-orphan", lazy="selectin"
    )

    bookings: Mapped[list["Booking"]] = relationship(
        "Booking", back_populates="property_rel", cascade="all, delete-orphan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Property(id={self.id}, name='{self.name}')>"
