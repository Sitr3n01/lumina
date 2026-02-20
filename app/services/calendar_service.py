"""
Serviço de gerenciamento de calendários.
Orquestra o processo completo de sincronização: download, parse, merge e detecção de conflitos.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.calendar_source import CalendarSource
from app.models.sync_log import SyncLog, SyncType, SyncStatus
from app.models.property import Property
from app.core.calendar_sync import get_calendar_engine
from app.core.conflict_detector import ConflictDetector
from app.services.booking_service import BookingService
from app.services.sync_action_service import SyncActionService
from app.models.sync_action import TargetPlatform
from app.telegram.notifications import NotificationService
from app.services.notification_db_service import NotificationDBService
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CalendarService:
    """Serviço para operações com calendários"""

    def __init__(self, db: Session):
        self.db = db
        self.booking_service = BookingService(db)
        self.sync_engine = get_calendar_engine()
        self.conflict_detector = ConflictDetector(db)
        self.sync_action_service = SyncActionService(db)

    def get_calendar_source_by_id(self, source_id: int) -> Optional[CalendarSource]:
        """Busca uma fonte de calendário por ID"""
        return self.db.query(CalendarSource).filter(
            CalendarSource.id == source_id
        ).first()

    def get_active_calendar_sources(self, property_id: int) -> List[CalendarSource]:
        """
        Retorna todas as fontes de calendário ativas de um imóvel.

        Args:
            property_id: ID do imóvel

        Returns:
            Lista de CalendarSource ativos
        """
        return self.db.query(CalendarSource).filter(
            CalendarSource.property_id == property_id,
            CalendarSource.sync_enabled == True
        ).all()

    async def sync_calendar_source(
        self,
        calendar_source: CalendarSource
    ) -> Dict[str, Any]:
        """
        Sincroniza uma fonte de calendário específica.

        Args:
            calendar_source: Fonte de calendário a sincronizar

        Returns:
            Dicionário com resultado da sincronização
        """
        logger.info(f"="*60)
        logger.info(f"Starting sync for {calendar_source.platform.value} (ID: {calendar_source.id})")
        logger.info(f"="*60)

        start_time = datetime.now(timezone.utc).replace(tzinfo=None)

        # Criar log de sincronização
        sync_log = SyncLog(
            calendar_source_id=calendar_source.id,
            sync_type=SyncType.ICAL,
            status=SyncStatus.SUCCESS,  # Será atualizado
            started_at=start_time
        )
        self.db.add(sync_log)
        self.db.commit()

        try:
            # Download e parse do iCal
            result = await self.sync_engine.sync_calendar_source(
                url=calendar_source.ical_url,
                platform=calendar_source.platform.value
            )

            if not result["success"]:
                # Erro no download/parse
                sync_log.status = SyncStatus.ERROR
                sync_log.error_message = result.get("error", "Unknown error")
                sync_log.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                sync_log.sync_duration_ms = int(
                    (sync_log.completed_at - sync_log.started_at).total_seconds() * 1000
                )
                self.db.commit()

                logger.error(f"❌ Sync failed: {result['error']}")
                return {
                    "success": False,
                    "error": result["error"],
                    "sync_log_id": sync_log.id
                }

            # Processar eventos
            events = result["events"]
            logger.info(f"Processing {len(events)} events...")

            stats = {
                "added": 0,
                "updated": 0,
                "cancelled": 0,
                "unchanged": 0
            }

            new_bookings = []

            for event_data in events:
                booking, action = self.booking_service.merge_booking_from_ical(
                    event_data=event_data,
                    calendar_source_id=calendar_source.id,
                    property_id=calendar_source.property_id
                )

                if action == "created":
                    stats["added"] += 1
                    new_bookings.append(booking)
                    logger.info(f"  🆕 Added: {booking.guest_name} ({booking.check_in_date})")
                elif action == "updated":
                    stats["updated"] += 1
                    logger.info(f"  🔄 Updated: {booking.guest_name} ({booking.check_in_date})")
                elif action == "cancelled":
                    stats["cancelled"] += 1
                    logger.info(f"  🚫 Cancelled: {booking.guest_name} ({booking.check_in_date})")
                else:
                    stats["unchanged"] += 1

            # Notificar novas reservas (logging + DB + futuramente Telegram)
            if new_bookings:
                try:
                    notification_service = NotificationService(self.db)
                    for booking in new_bookings:
                        notification_service.notify_new_booking(booking)
                    logger.info(f"  📱 Notified {len(new_bookings)} new booking(s)")
                except Exception as e:
                    logger.error(f"  ❌ Error sending notifications: {e}")

            # Notificar cancelamentos
            if stats.get("cancelled", 0) > 0:
                try:
                    notif_db = NotificationDBService(self.db)
                    notif_db.create(
                        type="booking_cancel",
                        title=f"{stats['cancelled']} reserva(s) cancelada(s)",
                        message=f"Detectado durante sincronização de {calendar_source.platform.value}",
                    )
                except Exception as e:
                    logger.error(f"  ❌ Error creating cancel notification: {e}")

            # Marcar reservas passadas como completadas
            completed_count = self.booking_service.mark_completed_bookings(
                calendar_source.property_id
            )

            # DETECÇÃO DE CONFLITOS
            logger.info("Detecting conflicts...")
            conflicts = self.conflict_detector.detect_all_conflicts(calendar_source.property_id)

            # Auto-resolver conflitos de reservas canceladas
            auto_resolved = self.conflict_detector.auto_resolve_cancelled_conflicts(
                calendar_source.property_id
            )

            # Criar ações de bloqueio para novos conflitos críticos
            conflicts_created = self._create_sync_actions_for_conflicts(
                conflicts,
                calendar_source.property_id
            )

            # Notificação DB para conflitos detectados
            if conflicts:
                try:
                    notif_db = NotificationDBService(self.db)
                    notif_db.create(
                        type="conflict",
                        title=f"{len(conflicts)} conflito(s) detectado(s)",
                        message=f"Verifique a página de conflitos para resolver.",
                    )
                except Exception as e:
                    logger.error(f"  ❌ Error creating conflict notification: {e}")

            # Atualizar log de sincronização
            sync_log.status = SyncStatus.SUCCESS
            sync_log.bookings_added = stats["added"]
            sync_log.bookings_updated = stats["updated"]
            sync_log.bookings_cancelled = stats["cancelled"]
            sync_log.conflicts_detected = len(conflicts)
            sync_log.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            sync_log.sync_duration_ms = int(
                (sync_log.completed_at - sync_log.started_at).total_seconds() * 1000
            )

            # Atualizar calendar_source
            calendar_source.last_sync_at = datetime.now(timezone.utc).replace(tzinfo=None)
            calendar_source.last_sync_status = "success"

            self.db.commit()

            logger.info(f"")
            logger.info(f"✅ Sync completed successfully!")
            logger.info(f"   Added: {stats['added']}")
            logger.info(f"   Updated: {stats['updated']}")
            logger.info(f"   Cancelled: {stats['cancelled']}")
            logger.info(f"   Unchanged: {stats['unchanged']}")
            logger.info(f"   Completed: {completed_count}")
            logger.info(f"   Conflicts detected: {len(conflicts)}")
            if auto_resolved > 0:
                logger.info(f"   Auto-resolved: {auto_resolved}")
            if conflicts_created > 0:
                logger.info(f"   ⚠️ Actions created: {conflicts_created}")
            logger.info(f"   Duration: {sync_log.sync_duration_ms}ms")
            logger.info(f"="*60)

            return {
                "success": True,
                "stats": stats,
                "sync_log_id": sync_log.id,
                "duration_ms": sync_log.sync_duration_ms
            }

        except Exception as e:
            logger.error(f"❌ Unexpected error during sync: {e}")
            logger.exception(e)

            # Atualizar log com erro
            sync_log.status = SyncStatus.ERROR
            sync_log.error_message = str(e)
            sync_log.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            sync_log.sync_duration_ms = int(
                (sync_log.completed_at - sync_log.started_at).total_seconds() * 1000
            )

            calendar_source.last_sync_status = "error"

            self.db.commit()

            return {
                "success": False,
                "error": str(e),
                "sync_log_id": sync_log.id
            }

    async def sync_all_sources(self, property_id: int) -> Dict[str, Any]:
        """
        Sincroniza todas as fontes de calendário de um imóvel.

        Args:
            property_id: ID do imóvel

        Returns:
            Dicionário com resultado consolidado
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"STARTING FULL CALENDAR SYNC FOR PROPERTY ID={property_id}")
        logger.info(f"{'='*60}\n")

        sources = self.get_active_calendar_sources(property_id)

        if not sources:
            logger.warning("No active calendar sources found")
            return {
                "success": False,
                "error": "No active calendar sources",
                "results": []
            }

        results = []
        total_stats = {
            "added": 0,
            "updated": 0,
            "cancelled": 0,
            "unchanged": 0
        }

        for source in sources:
            result = await self.sync_calendar_source(source)
            results.append({
                "calendar_source_id": source.id,
                "platform": source.platform.value,
                **result
            })

            if result.get("success") and "stats" in result:
                stats = result["stats"]
                total_stats["added"] += stats.get("added", 0)
                total_stats["updated"] += stats.get("updated", 0)
                total_stats["cancelled"] += stats.get("cancelled", 0)
                total_stats["unchanged"] += stats.get("unchanged", 0)

        all_successful = all(r.get("success", False) for r in results)

        logger.info(f"\n{'='*60}")
        logger.info(f"FULL SYNC COMPLETED")
        logger.info(f"{'='*60}")
        logger.info(f"Total Changes:")
        logger.info(f"  🆕 Added: {total_stats['added']}")
        logger.info(f"  🔄 Updated: {total_stats['updated']}")
        logger.info(f"  🚫 Cancelled: {total_stats['cancelled']}")
        logger.info(f"  ✅ Unchanged: {total_stats['unchanged']}")
        logger.info(f"{'='*60}\n")

        return {
            "success": all_successful,
            "total_stats": total_stats,
            "results": results
        }

    def _create_sync_actions_for_conflicts(
        self,
        conflicts: list,
        property_id: int
    ) -> int:
        """
        Cria ações de sincronização para conflitos detectados.
        Determina qual plataforma precisa ser bloqueada.

        Args:
            conflicts: Lista de conflitos detectados
            property_id: ID do imóvel

        Returns:
            Número de ações criadas
        """
        actions_created = 0

        for conflict in conflicts:
            # Já existe ação para este conflito?
            if conflict.resolved:
                continue

            booking1 = conflict.booking_1
            booking2 = conflict.booking_2

            # Determinar qual reserva veio primeiro (pela data de criação)
            if booking1.created_at < booking2.created_at:
                first_booking = booking1
                second_booking = booking2
            else:
                first_booking = booking2
                second_booking = booking1

            # Determinar plataforma alvo (bloquear na plataforma da segunda reserva)
            target_platform = TargetPlatform.AIRBNB if second_booking.platform == "airbnb" else TargetPlatform.BOOKING

            # Criar ação de bloqueio
            reason = (
                f"🚨 CONFLITO DETECTADO!\n"
                f"Reserva existente: {first_booking.guest_name} ({first_booking.platform.upper()})\n"
                f"Conflito com: {second_booking.guest_name} ({second_booking.platform.upper()})\n"
                f"Período: {conflict.overlap_start.strftime('%d/%m')} - {conflict.overlap_end.strftime('%d/%m/%Y')}\n"
                f"Severidade: {conflict.severity.upper()}"
            )

            # Determinar prioridade baseada na severidade
            priority_map = {
                "critical": "critical",
                "high": "high",
                "medium": "medium",
                "low": "low"
            }
            priority = priority_map.get(conflict.severity, "high")

            # Criar ação
            self.sync_action_service.create_block_action(
                property_id=property_id,
                start_date=conflict.overlap_start,
                end_date=conflict.overlap_end,
                target_platform=target_platform,
                reason=reason,
                trigger_booking=second_booking,
                priority=priority
            )

            actions_created += 1
            logger.warning(f"⚠️ Created sync action for conflict {conflict.id}")

        return actions_created

    def get_sync_history(
        self,
        calendar_source_id: int,
        limit: int = 10
    ) -> List[SyncLog]:
        """
        Retorna o histórico de sincronizações.

        Args:
            calendar_source_id: ID da fonte de calendário
            limit: Número máximo de logs

        Returns:
            Lista de SyncLog
        """
        return self.db.query(SyncLog).filter(
            SyncLog.calendar_source_id == calendar_source_id
        ).order_by(SyncLog.started_at.desc()).limit(limit).all()

    def get_last_sync_log(self, calendar_source_id: int) -> Optional[SyncLog]:
        """
        Retorna o último log de sincronização.

        Args:
            calendar_source_id: ID da fonte de calendário

        Returns:
            SyncLog ou None
        """
        return self.db.query(SyncLog).filter(
            SyncLog.calendar_source_id == calendar_source_id
        ).order_by(SyncLog.started_at.desc()).first()
