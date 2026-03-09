"""
Modelo BookingConflict - Registra conflitos/sobreposições entre reservas.
"""
from datetime import date, datetime, timezone
from sqlalchemy import String, Integer, Boolean, Date, DateTime, ForeignKey, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.booking import Booking


class ConflictType(str, enum.Enum):
    """Tipos de conflito entre reservas"""
    OVERLAP = "overlap"  # Sobreposição parcial de datas
    DUPLICATE = "duplicate"  # Mesma reserva duplicada em plataformas


class BookingConflict(Base):
    """Modelo de conflito entre reservas"""

    __tablename__ = "booking_conflicts"

    # FIX: UNIQUE constraint para prevenir race conditions e duplicatas
    __table_args__ = (
        UniqueConstraint('booking_id_1', 'booking_id_2', 'conflict_type',
                        name='uq_conflict_pair',
                        info={'description': 'Previne conflitos duplicados'}),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    # Reservas em conflito
    booking_id_1: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID da primeira reserva"
    )

    booking_id_2: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID da segunda reserva"
    )

    # Tipo de conflito
    conflict_type: Mapped[ConflictType] = mapped_column(
        SQLEnum(ConflictType),
        nullable=False,
        comment="Tipo de conflito (overlap/duplicate)"
    )

    # Período de sobreposição (apenas para OVERLAP)
    overlap_start: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Início da sobreposição"
    )

    overlap_end: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="Fim da sobreposição"
    )

    # Status de resolução
    resolved: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Se o conflito foi resolvido"
    )

    resolution_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Notas sobre como foi resolvido"
    )

    # Timestamps
    detected_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        comment="Quando o conflito foi detectado"
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        comment="Quando o conflito foi resolvido"
    )

    # Relacionamentos
    booking_1: Mapped["Booking"] = relationship(
        "Booking",
        foreign_keys=[booking_id_1],
        lazy="selectin"
    )

    booking_2: Mapped["Booking"] = relationship(
        "Booking",
        foreign_keys=[booking_id_2],
        lazy="selectin"
    )

    def __repr__(self) -> str:
        status = "✅ Resolved" if self.resolved else "⚠️ Active"
        return f"<BookingConflict(id={self.id}, type='{self.conflict_type.value}', {status})>"

    @property
    def overlap_nights(self) -> int:
        """Calcula o número de noites em conflito"""
        if not self.overlap_start or not self.overlap_end:
            return 0
        return (self.overlap_end - self.overlap_start).days

    @property
    def severity(self) -> str:
        """Determina a severidade do conflito"""
        if self.conflict_type == ConflictType.DUPLICATE:
            return "high"

        if self.overlap_nights >= 7:
            return "critical"
        elif self.overlap_nights >= 3:
            return "high"
        elif self.overlap_nights >= 1:
            return "medium"
        else:
            return "low"

    def mark_as_resolved(self, notes: str = None) -> None:
        """Marca o conflito como resolvido"""
        self.resolved = True
        self.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if notes:
            self.resolution_notes = notes
