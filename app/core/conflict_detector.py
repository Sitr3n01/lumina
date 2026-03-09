"""
Detector de conflitos entre reservas.
Identifica sobreposições de datas e reservas duplicadas entre Airbnb e Booking.
"""
from datetime import date, datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy import and_
from sqlalchemy.orm import Session, selectinload

from app.models.booking import Booking, BookingStatus
from app.models.booking_conflict import BookingConflict, ConflictType
from app.models.sync_action import TargetPlatform
from app.utils.logger import get_logger
from app.utils.date_utils import dates_overlap, get_overlap_period

logger = get_logger(__name__)


class ConflictDetector:
    """Detector de conflitos entre reservas"""

    def __init__(self, db: Session):
        self.db = db

    def detect_all_conflicts(self, property_id: int) -> List[BookingConflict]:
        """
        Detecta todos os conflitos de um imóvel.
        Verifica sobreposições e duplicatas.

        Args:
            property_id: ID do imóvel

        Returns:
            Lista de conflitos detectados
        """
        logger.info(f"Starting conflict detection for property {property_id}")

        # Buscar todas as reservas confirmadas
        bookings = self._get_active_bookings(property_id)

        if len(bookings) < 2:
            logger.info("Less than 2 bookings, no conflicts possible")
            return []

        conflicts = []

        # Comparar cada par de reservas
        for i in range(len(bookings)):
            for j in range(i + 1, len(bookings)):
                booking1 = bookings[i]
                booking2 = bookings[j]

                # Verificar se já existe conflito registrado para este par
                existing = self._get_existing_conflict(booking1.id, booking2.id)

                if existing and not existing.resolved:
                    # Conflito já registrado e não resolvido
                    conflicts.append(existing)
                    continue

                # Detectar novo conflito
                conflict = self._check_booking_pair(booking1, booking2)

                if conflict:
                    conflicts.append(conflict)

        logger.info(f"Detected {len(conflicts)} conflicts")
        return conflicts

    def check_booking_conflict(self, booking: Booking) -> List[BookingConflict]:
        """
        Verifica se uma reserva específica conflita com outras.
        Útil ao adicionar/atualizar uma reserva.

        Args:
            booking: Reserva a verificar

        Returns:
            Lista de conflitos encontrados
        """
        logger.info(f"Checking conflicts for booking {booking.id}")

        # Buscar reservas que se sobrepõem
        overlapping = self._get_overlapping_bookings(
            property_id=booking.property_id,
            check_in=booking.check_in_date,
            check_out=booking.check_out_date,
            exclude_booking_id=booking.id
        )

        conflicts = []

        for other_booking in overlapping:
            # Verificar se já existe conflito
            existing = self._get_existing_conflict(booking.id, other_booking.id)

            if existing and not existing.resolved:
                conflicts.append(existing)
                continue

            # Detectar novo conflito
            conflict = self._check_booking_pair(booking, other_booking)

            if conflict:
                conflicts.append(conflict)

        return conflicts

    def _check_booking_pair(
        self,
        booking1: Booking,
        booking2: Booking
    ) -> Optional[BookingConflict]:
        """
        Verifica conflito entre um par de reservas.

        Args:
            booking1: Primeira reserva
            booking2: Segunda reserva

        Returns:
            BookingConflict se houver conflito, None caso contrário
        """
        # Verificar se são da mesma plataforma ou plataformas diferentes
        same_platform = booking1.platform == booking2.platform

        # Verificar sobreposição de datas
        if not booking1.overlaps_with(booking2.check_in_date, booking2.check_out_date):
            return None

        # Calcular período de sobreposição
        overlap = get_overlap_period(
            booking1.check_in_date,
            booking1.check_out_date,
            booking2.check_in_date,
            booking2.check_out_date
        )

        if not overlap:
            return None

        overlap_start, overlap_end = overlap

        # Determinar tipo de conflito
        if self._is_duplicate(booking1, booking2):
            conflict_type = ConflictType.DUPLICATE
            logger.warning(f"[DUP] DUPLICATE booking detected: {booking1.id} and {booking2.id}")
        else:
            conflict_type = ConflictType.OVERLAP
            logger.warning(f"[OVERLAP] OVERLAP detected: {booking1.id} and {booking2.id}")

        # Criar registro de conflito
        conflict = BookingConflict(
            booking_id_1=booking1.id,
            booking_id_2=booking2.id,
            conflict_type=conflict_type,
            overlap_start=overlap_start,
            overlap_end=overlap_end,
            resolved=False
        )

        # FIX: Tratar race condition com IntegrityError
        from sqlalchemy.exc import IntegrityError
        try:
            self.db.add(conflict)
            self.db.commit()
            self.db.refresh(conflict)
            logger.info(f"Conflict registered: ID={conflict.id}, type={conflict_type.value}, severity={conflict.severity}")
        except IntegrityError:
            # Race condition: outro request já criou este conflito
            self.db.rollback()
            existing = self._get_existing_conflict(booking1.id, booking2.id)
            if existing:
                conflict = existing
                logger.debug(f"Conflict already exists (race condition): ID={conflict.id}")
            else:
                # Caso muito raro: re-raise error
                logger.error("IntegrityError but conflict not found")
                raise

        return conflict

    def _is_duplicate(self, booking1: Booking, booking2: Booking) -> bool:
        """
        Verifica se duas reservas são duplicatas (mesma reserva em plataformas diferentes).

        Critérios:
        - Datas idênticas ou muito próximas (±1 dia)
        - Nome do hóspede similar
        - Plataformas diferentes

        Args:
            booking1: Primeira reserva
            booking2: Segunda reserva

        Returns:
            True se parecem ser duplicatas
        """
        # Mesma plataforma = não é duplicata
        if booking1.platform == booking2.platform:
            return False

        # FIX: Validar que datas existem antes de calcular diferença
        if not booking1.check_in_date or not booking2.check_in_date or \
           not booking1.check_out_date or not booking2.check_out_date:
            return False  # Não pode ser duplicata se tem datas incompletas

        # Verificar datas
        date_diff_in = abs((booking1.check_in_date - booking2.check_in_date).days)
        date_diff_out = abs((booking1.check_out_date - booking2.check_out_date).days)

        # Datas muito próximas (±1 dia)
        dates_match = date_diff_in <= 1 and date_diff_out <= 1

        # Verificar nomes similares
        name1 = booking1.guest_name.lower().strip()
        name2 = booking2.guest_name.lower().strip()

        # Nome exato ou primeiro nome igual
        first_name1 = name1.split()[0] if name1 else ""
        first_name2 = name2.split()[0] if name2 else ""

        names_similar = (
            name1 == name2 or
            first_name1 == first_name2 or
            name1 in name2 or
            name2 in name1
        )

        return dates_match and names_similar

    def _get_active_bookings(self, property_id: int) -> List[Booking]:
        """
        Busca todas as reservas confirmadas de um imóvel.

        Args:
            property_id: ID do imóvel

        Returns:
            Lista de reservas confirmadas
        """
        return self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED
            )
        ).order_by(Booking.check_in_date).all()

    def _get_overlapping_bookings(
        self,
        property_id: int,
        check_in: date,
        check_out: date,
        exclude_booking_id: int = None
    ) -> List[Booking]:
        """
        Busca reservas que se sobrepõem a um período.

        Args:
            property_id: ID do imóvel
            check_in: Data de check-in
            check_out: Data de check-out
            exclude_booking_id: ID de reserva para excluir (opcional)

        Returns:
            Lista de reservas que se sobrepõem
        """
        query = self.db.query(Booking).filter(
            and_(
                Booking.property_id == property_id,
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_in_date < check_out,
                Booking.check_out_date > check_in
            )
        )

        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)

        return query.all()

    def _get_existing_conflict(
        self,
        booking_id_1: int,
        booking_id_2: int
    ) -> Optional[BookingConflict]:
        """
        Verifica se já existe conflito registrado entre duas reservas.

        Args:
            booking_id_1: ID da primeira reserva
            booking_id_2: ID da segunda reserva

        Returns:
            BookingConflict existente ou None
        """
        # Conflito pode estar em qualquer ordem
        return self.db.query(BookingConflict).filter(
            and_(
                BookingConflict.resolved == False,
                (
                    and_(
                        BookingConflict.booking_id_1 == booking_id_1,
                        BookingConflict.booking_id_2 == booking_id_2
                    ) |
                    and_(
                        BookingConflict.booking_id_1 == booking_id_2,
                        BookingConflict.booking_id_2 == booking_id_1
                    )
                )
            )
        ).first()

    def get_active_conflicts(self, property_id: int) -> List[BookingConflict]:
        """
        Retorna conflitos ativos (não resolvidos) de um imóvel.

        Args:
            property_id: ID do imóvel

        Returns:
            Lista de conflitos ativos
        """
        # Buscar conflitos via join com bookings
        # Usar selectinload para carregar booking_1 e booking_2 de uma vez (evita N+1)
        return self.db.query(BookingConflict).join(
            Booking,
            BookingConflict.booking_id_1 == Booking.id
        ).options(
            selectinload(BookingConflict.booking_1),
            selectinload(BookingConflict.booking_2)
        ).filter(
            and_(
                Booking.property_id == property_id,
                BookingConflict.resolved == False
            )
        ).all()

    def resolve_conflict(
        self,
        conflict_id: int,
        resolution_notes: str
    ) -> Optional[BookingConflict]:
        """
        Marca um conflito como resolvido.

        Args:
            conflict_id: ID do conflito
            resolution_notes: Notas sobre a resolução

        Returns:
            Conflito resolvido ou None
        """
        conflict = self.db.query(BookingConflict).filter(
            BookingConflict.id == conflict_id
        ).first()

        if not conflict:
            logger.warning(f"Conflict {conflict_id} not found")
            return None

        conflict.mark_as_resolved(resolution_notes)
        self.db.commit()
        self.db.refresh(conflict)

        logger.info(f"[OK] Conflict {conflict_id} resolved: {resolution_notes}")
        return conflict

    def get_conflict_summary(self, property_id: int) -> Dict[str, Any]:
        """
        Retorna resumo de conflitos.

        Args:
            property_id: ID do imóvel

        Returns:
            Dicionário com estatísticas
        """
        active_conflicts = self.get_active_conflicts(property_id)

        critical = sum(1 for c in active_conflicts if c.severity == "critical")
        high = sum(1 for c in active_conflicts if c.severity == "high")
        medium = sum(1 for c in active_conflicts if c.severity == "medium")
        low = sum(1 for c in active_conflicts if c.severity == "low")

        duplicates = sum(1 for c in active_conflicts if c.conflict_type == ConflictType.DUPLICATE)
        overlaps = sum(1 for c in active_conflicts if c.conflict_type == ConflictType.OVERLAP)

        return {
            "total": len(active_conflicts),
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
            "duplicates": duplicates,
            "overlaps": overlaps
        }

    def auto_resolve_cancelled_conflicts(self, property_id: int) -> int:
        """
        Auto-resolve conflitos onde uma das reservas foi cancelada.

        Args:
            property_id: ID do imóvel

        Returns:
            Número de conflitos resolvidos
        """
        active_conflicts = self.get_active_conflicts(property_id)
        resolved_count = 0

        for conflict in active_conflicts:
            booking1 = conflict.booking_1
            booking2 = conflict.booking_2

            # Se uma das reservas foi cancelada, resolver conflito
            if booking1.status == BookingStatus.CANCELLED or booking2.status == BookingStatus.CANCELLED:
                cancelled_booking = booking1 if booking1.status == BookingStatus.CANCELLED else booking2
                conflict.mark_as_resolved(f"Auto-resolved: Booking {cancelled_booking.id} was cancelled")
                resolved_count += 1

        if resolved_count > 0:
            self.db.commit()
            logger.info(f"Auto-resolved {resolved_count} conflicts due to cancellations")

        return resolved_count
