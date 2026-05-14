"""
Modelo Guest - Representa um hóspede no sistema.
Usado no MVP2, mas criado agora por ser referenciado em Booking.
"""

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.booking import Booking


class Guest(BaseModel):
    """Modelo de hóspede"""

    __tablename__ = "guests"

    # Informações pessoais
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True, comment="Nome completo do hóspede")

    email: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True, comment="Email do hóspede")

    phone: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Telefone do hóspede")

    # Documentação
    document_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Número do documento (CPF/passaporte)"
    )

    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="Nacionalidade")

    # Notas
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Notas sobre o hóspede")

    # Relacionamentos
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="guest", lazy="select")

    def __repr__(self) -> str:
        return f"<Guest(id={self.id}, name='{self.full_name}')>"
