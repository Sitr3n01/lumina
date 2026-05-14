"""
Script para executar sincronização manual dos calendários.
Útil para testes e debug durante o desenvolvimento.
"""

import asyncio
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.database.session import get_db_context
from app.models.property import Property
from app.services.calendar_service import CalendarService
from app.utils.logger import get_logger, setup_logger

# Configura logging
setup_logger(log_level=settings.LOG_LEVEL, app_name=settings.APP_NAME)
logger = get_logger(__name__)


async def run_manual_sync():
    """Executa sincronização manual de todos os calendários"""

    logger.info("\n" + "=" * 60)
    logger.info("MANUAL CALENDAR SYNC - SENTINEL")
    logger.info("=" * 60 + "\n")

    try:
        with get_db_context() as db:
            # Buscar a primeira propriedade (assumindo single-property por enquanto)
            property_obj = db.query(Property).first()

            if not property_obj:
                logger.error("❌ No property found in database!")
                logger.error("Run 'python scripts/init_db.py' first")
                return

            logger.info(f"Property: {property_obj.name}")
            logger.info(f"Property ID: {property_obj.id}\n")

            # Executar sincronização
            calendar_service = CalendarService(db)
            result = await calendar_service.sync_all_sources(property_obj.id)

            # Exibir resumo
            if result["success"]:
                logger.info("\n" + "=" * 60)
                logger.info("✅ SYNC COMPLETED SUCCESSFULLY!")
                logger.info("=" * 60)
                logger.info("\nSummary:")

                stats = result["total_stats"]
                logger.info(f"  🆕 New bookings: {stats['added']}")
                logger.info(f"  🔄 Updated bookings: {stats['updated']}")
                logger.info(f"  🚫 Cancelled bookings: {stats['cancelled']}")
                logger.info(f"  ✅ Unchanged: {stats['unchanged']}")

                logger.info("\nPer Source:")
                for source_result in result["results"]:
                    platform = source_result["platform"]
                    success = "✅" if source_result["success"] else "❌"
                    logger.info(f"  {success} {platform.upper()}")

                    if source_result["success"] and "stats" in source_result:
                        s = source_result["stats"]
                        logger.info(f"     Added: {s['added']}, Updated: {s['updated']}, Cancelled: {s['cancelled']}")

                logger.info("\n" + "=" * 60)
                logger.info("Next steps:")
                logger.info("  - Check data/logs/ for detailed logs")
                logger.info("  - Verify bookings in database")
                logger.info("  - Start the Telegram bot to interact with data")
                logger.info("=" * 60 + "\n")

            else:
                logger.error("\n❌ SYNC FAILED!")
                logger.error("Check logs for details\n")

    except Exception as e:
        logger.error(f"\n❌ Error during manual sync: {e}")
        logger.exception(e)
        sys.exit(1)


async def run_sync_with_stats():
    """Versão estendida que mostra estatísticas do banco após sync"""

    await run_manual_sync()

    # Mostrar estatísticas do banco
    logger.info("\n" + "=" * 60)
    logger.info("DATABASE STATISTICS")
    logger.info("=" * 60 + "\n")

    try:
        from app.core.conflict_detector import ConflictDetector
        from app.models.booking import Booking
        from app.models.booking_conflict import BookingConflict
        from app.models.calendar_source import CalendarSource
        from app.models.sync_action import SyncAction
        from app.models.sync_log import SyncLog
        from app.services.sync_action_service import SyncActionService

        with get_db_context() as db:
            # Estatísticas
            total_bookings = db.query(Booking).count()
            total_sources = db.query(CalendarSource).count()
            total_syncs = db.query(SyncLog).count()
            total_conflicts = db.query(BookingConflict).filter(BookingConflict.resolved == False).count()
            total_actions = db.query(SyncAction).filter(SyncAction.status == "pending").count()

            logger.info(f"Total Bookings: {total_bookings}")
            logger.info(f"Calendar Sources: {total_sources}")
            logger.info(f"Sync Logs: {total_syncs}")
            logger.info(f"Active Conflicts: {total_conflicts}")
            logger.info(f"Pending Actions: {total_actions}")

            # Próximas reservas
            property_obj = db.query(Property).first()
            if property_obj:
                from app.services.booking_service import BookingService

                booking_service = BookingService(db)

                current = booking_service.get_current_booking(property_obj.id)
                if current:
                    logger.info(f"\n📍 Current Guest: {current.guest_name}")
                    logger.info(f"   Check-out: {current.check_out_date}")

                next_bookings = booking_service.get_next_bookings(property_obj.id, limit=3)
                if next_bookings:
                    logger.info("\n📅 Next Bookings:")
                    for booking in next_bookings:
                        logger.info(
                            f"   - {booking.check_in_date}: {booking.guest_name} ({booking.nights_count} nights)"
                        )

                # Mostrar conflitos ativos
                conflict_detector = ConflictDetector(db)
                active_conflicts = conflict_detector.get_active_conflicts(property_obj.id)

                if active_conflicts:
                    logger.info(f"\n⚠️ ACTIVE CONFLICTS ({len(active_conflicts)}):")
                    for conflict in active_conflicts:
                        b1 = conflict.booking_1
                        b2 = conflict.booking_2
                        logger.info(f"\n   🚨 Conflict ID {conflict.id} - {conflict.severity.upper()}")
                        logger.info(
                            f"      {b1.platform.upper()}: {b1.guest_name} ({b1.check_in_date} - {b1.check_out_date})"
                        )
                        logger.info(
                            f"      {b2.platform.upper()}: {b2.guest_name} ({b2.check_in_date} - {b2.check_out_date})"
                        )
                        logger.info(f"      Overlap: {conflict.overlap_nights} night(s)")

                # Mostrar ações pendentes
                sync_action_service = SyncActionService(db)
                pending_actions = sync_action_service.get_pending_actions(property_obj.id)

                if pending_actions:
                    logger.info(f"\n📋 PENDING ACTIONS ({len(pending_actions)}):")
                    for action in pending_actions:
                        logger.info(f"\n   {action.priority_emoji} {action.get_action_description()}")
                        logger.info(f"      Priority: {action.priority.upper()}")
                        if action.action_url:
                            logger.info(f"      URL: {action.action_url}")

            logger.info("\n" + "=" * 60 + "\n")

    except Exception as e:
        logger.error(f"Error getting statistics: {e}")


if __name__ == "__main__":
    # Verificar se foi passado argumento --stats
    if len(sys.argv) > 1 and sys.argv[1] == "--stats":
        asyncio.run(run_sync_with_stats())
    else:
        asyncio.run(run_manual_sync())
