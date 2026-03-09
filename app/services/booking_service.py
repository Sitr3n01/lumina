"""
Serviço de gerenciamento de reservas (bookings).
Lógica de negócio para criar, atualizar, cancelar e consultar reservas.
"""
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.property import Property
from app.utils.logger import get_logger
from app.utils.date_utils import today_local, is_current_booking, is_past_booking

logger = get_logger(__name__)


class BookingService:
    """Serviço para operações com reservas"""

    def __init__(self, db: Session):
        self.db = db

    def get_booking_by_id(self, booking_id: int) -> Optional[Booking]:
        """Busca uma reserva por ID"""
        return self.db.query(Booking).filter(Booking.id == booking_id).first()

    def get_booking_by_external_id(
        self,
        external_id: str,
        platform: str,
        property_id: int
    ) -> Optional[Booking]:
        """
        Busca uma reserva pelo ID externo da plataforma.

        Args:
            external_id: ID da reserva na plataforma (Airbnb/Booking)
            platform: Plataforma de origem
            property_id: ID do imóvel

        Returns:
            Booking ou None
        """
        return self.db.query(Booking).filter(
            and_(
                Booking.external_id == external_id,
                Booking.platform == platform,
                Booking.property_id == property_id
            )
        ).first()

    def get_active_bookings(self, property_id: int) -> List[Booking]:
        """
        Retorna todas as reservas ativas (confirmadas e não passadas).

        Args:
            property_id: ID do imóvel

        Returns:
            Lista de reservas ativas
        """
        today = today_local()

        return self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_out_date >= today
            )
        ).order_by(Booking.check_in_date).all()

    def get_bookings_in_period(
        self,
        property_id: int,
        start_date: date,
        end_date: date
    ) -> List[Booking]:
        """
        Retorna reservas que se sobrepõem a um período.

        Args:
            property_id: ID do imóvel
            start_date: Início do período
            end_date: Fim do período

        Returns:
            Lista de reservas no período
        """
        return self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.check_in_date < end_date,
                Booking.check_out_date > start_date,
                Booking.status == BookingStatus.CONFIRMED
            )
        ).order_by(Booking.check_in_date).all()

    def get_current_booking(self, property_id: int) -> Optional[Booking]:
        """
        Retorna a reserva ativa no momento (hóspede atual).

        Args:
            property_id: ID do imóvel

        Returns:
            Booking atual ou None
        """
        today = today_local()

        return self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_in_date <= today,
                Booking.check_out_date > today
            )
        ).first()

    def get_next_bookings(self, property_id: int, limit: int = 5) -> List[Booking]:
        """
        Retorna as próximas N reservas futuras.

        Args:
            property_id: ID do imóvel
            limit: Número máximo de reservas

        Returns:
            Lista de próximas reservas
        """
        today = today_local()

        return self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_in_date >= today
            )
        ).order_by(Booking.check_in_date).limit(limit).all()

    def create_booking(self, booking_data: Dict[str, Any]) -> Booking:
        """
        Cria uma nova reserva.

        Args:
            booking_data: Dicionário com dados da reserva

        Returns:
            Booking criado
        """
        logger.info(f"Creating new booking: {booking_data.get('guest_name')} - {booking_data.get('check_in_date')}")

        booking = Booking(**booking_data)
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)

        logger.info(f"[OK] Booking created: ID={booking.id}")
        return booking

    def update_booking(self, booking: Booking, update_data: Dict[str, Any]) -> Booking:
        """
        Atualiza uma reserva existente.

        Args:
            booking: Booking a ser atualizado
            update_data: Dicionário com novos dados

        Returns:
            Booking atualizado
        """
        logger.info(f"Updating booking ID={booking.id}")

        for key, value in update_data.items():
            if hasattr(booking, key):
                setattr(booking, key, value)

        self.db.commit()
        self.db.refresh(booking)

        logger.info(f"[OK] Booking updated: ID={booking.id}")
        return booking

    def cancel_booking(self, booking: Booking) -> Booking:
        """
        Cancela uma reserva.

        Args:
            booking: Booking a ser cancelado

        Returns:
            Booking cancelado
        """
        logger.info(f"Cancelling booking ID={booking.id}")

        booking.status = BookingStatus.CANCELLED
        self.db.commit()
        self.db.refresh(booking)

        logger.info(f"[DEL] Booking cancelled: ID={booking.id}")
        return booking

    def get_bookings_paginated(
        self,
        property_id: int,
        platform: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[List[Booking], int]:
        """
        Retorna reservas com paginação eficiente no banco de dados.

        Args:
            property_id: ID do imóvel
            platform: Filtrar por plataforma (opcional)
            status: Filtrar por status (opcional)
            page: Número da página
            page_size: Itens por página

        Returns:
            Tupla (bookings, total)
        """
        # Query base
        query = self.db.query(Booking).filter(
            Booking.property_id == property_id
        )

        # Aplicar filtros
        if platform:
            query = query.filter(Booking.platform == platform)

        if status:
            query = query.filter(Booking.status == status)

        # Contar total ANTES da paginação
        total = query.count()

        # Aplicar paginação no SQL
        bookings = query.order_by(Booking.check_in_date.desc())\
            .offset((page - 1) * page_size)\
            .limit(page_size)\
            .all()

        return bookings, total

    def merge_booking_from_ical(
        self,
        event_data: Dict[str, Any],
        calendar_source_id: int,
        property_id: int
    ) -> tuple[Booking, str]:
        """
        Cria ou atualiza uma reserva com base em dados do iCal.
        Implementa lógica de merge: create, update ou cancel.

        Args:
            event_data: Dados extraídos do evento iCal
            calendar_source_id: ID da fonte do calendário
            property_id: ID do imóvel

        Returns:
            Tupla (booking, action) onde action é "created", "updated" ou "cancelled"
        """
        external_id = event_data.get("external_id")
        platform = event_data.get("platform")

        # Buscar reserva existente
        existing = self.get_booking_by_external_id(external_id, platform, property_id)

        if existing:
            # Reserva já existe - verificar se precisa atualizar
            new_status = event_data.get("status")

            if new_status == "cancelled" and existing.status != BookingStatus.CANCELLED:
                # Cancelar reserva
                self.cancel_booking(existing)
                return (existing, "cancelled")

            # Verificar se houve mudanças significativas
            changes = {}

            if existing.check_in_date != event_data.get("check_in_date"):
                changes["check_in_date"] = event_data.get("check_in_date")

            if existing.check_out_date != event_data.get("check_out_date"):
                changes["check_out_date"] = event_data.get("check_out_date")

            if existing.guest_name != event_data.get("guest_name"):
                changes["guest_name"] = event_data.get("guest_name")

            # Sempre atualizar raw_ical_data
            changes["raw_ical_data"] = event_data.get("raw_ical_data")
            changes["nights_count"] = event_data.get("nights_count")

            if changes:
                self.update_booking(existing, changes)
                return (existing, "updated")

            # Sem mudanças
            return (existing, "unchanged")

        else:
            # Nova reserva - criar
            booking_data = {
                **event_data,
                "calendar_source_id": calendar_source_id,
                "property_id": property_id,
            }

            # Remover external_id se for None
            if not booking_data.get("external_id"):
                booking_data.pop("external_id", None)

            booking = self.create_booking(booking_data)
            return (booking, "created")

    def mark_completed_bookings(self, property_id: int) -> int:
        """
        Marca reservas passadas como completadas.

        Args:
            property_id: ID do imóvel

        Returns:
            Número de reservas marcadas como completadas
        """
        today = today_local()

        result = self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_out_date < today
            )
        ).update(
            {"status": BookingStatus.COMPLETED},
            synchronize_session=False
        )

        self.db.commit()

        if result > 0:
            logger.info(f"Marked {result} bookings as completed")

        return result

    def get_booking_statistics(self, property_id: int) -> Dict[str, int]:
        """
        Retorna estatísticas das reservas.

        Args:
            property_id: ID do imóvel

        Returns:
            Dicionário com estatísticas
        """
        total = self.db.query(Booking).filter(
            Booking.property_id == property_id
        ).count()

        confirmed = self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED
            )
        ).count()

        completed = self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.COMPLETED
            )
        ).count()

        cancelled = self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CANCELLED
            )
        ).count()

        return {
            "total": total,
            "confirmed": confirmed,
            "completed": completed,
            "cancelled": cancelled,
        }
