"""
Serviço de notificações.
Gerencia alertas e notificações para o usuário (Telegram, logs, etc).
"""

from app.constants import (
    EMOJI_AIRBNB,
    EMOJI_BOOKING,
    EMOJI_CONFLICT,
    EMOJI_ERROR,
    EMOJI_NEW,
    EMOJI_SUCCESS,
    EMOJI_SYNC,
    EMOJI_WARNING,
)
from app.models.booking import Booking
from app.models.booking_conflict import BookingConflict
from app.models.sync_action import SyncAction
from app.models.sync_log import SyncLog
from app.utils.date_utils import format_date_range, format_date_short
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NotificationService:
    """
    Serviço unificado de notificações.
    Combina: logging + persistência no DB + futuramente Telegram.
    Aceita db=None para compatibilidade retroativa (só faz logging).
    """

    def __init__(self, db=None):
        """
        Args:
            db: Sessão do banco (opcional). Se fornecida, persiste notificações no DB.
        """
        self.telegram_enabled = False
        self.db = db
        self._db_service = None

    @property
    def db_service(self):
        """Lazy init do NotificationDBService"""
        if self._db_service is None and self.db is not None:
            from app.services.notification_db_service import NotificationDBService

            self._db_service = NotificationDBService(self.db)
        return self._db_service

    def _persist(self, type: str, title: str, message: str, booking_id: int = None):
        """Persiste notificação no banco se db estiver disponível"""
        if self.db_service:
            try:
                self.db_service.create(
                    type=type,
                    title=title,
                    message=message,
                    booking_id=booking_id,
                )
            except Exception as e:
                logger.error(f"Failed to persist notification: {e}")

    def notify_sync_completed(self, sync_log: SyncLog, stats: dict[str, int]) -> None:
        """Notifica sobre conclusão de sincronização."""
        if sync_log.status.value == "success":
            message = self._format_sync_success_message(sync_log, stats)
            title = "Sincronização concluída"
        else:
            message = self._format_sync_error_message(sync_log)
            title = "Erro na sincronização"

        logger.info(f"Sync notification: {message}")
        self._persist("sync", title, message)

    def notify_conflict_detected(self, conflicts: list[BookingConflict]) -> None:
        """Notifica sobre conflitos detectados."""
        if not conflicts:
            return

        for conflict in conflicts:
            message = self._format_conflict_message(conflict)
            logger.warning(f"Conflict notification: {message}")
            self._persist("conflict", f"Conflito detectado ({conflict.severity})", message)

    def notify_new_booking(self, booking: Booking) -> None:
        """Notifica sobre nova reserva."""
        message = self._format_new_booking_message(booking)
        logger.info(f"New booking notification: {message}")
        self._persist("new_booking", f"Nova reserva - {booking.guest_name}", message, booking_id=booking.id)

    def notify_sync_action_created(self, action: SyncAction) -> None:
        """Notifica sobre nova ação de sincronização pendente."""
        message = self._format_sync_action_message(action)
        logger.warning(f"Sync action notification: {message}")
        self._persist("system", "Ação pendente", message)

    def get_pending_actions_summary(self, actions: list[SyncAction]) -> str:
        """
        Cria resumo de ações pendentes.

        Args:
            actions: Lista de ações pendentes

        Returns:
            Mensagem formatada
        """
        if not actions:
            return f"{EMOJI_SUCCESS} Nenhuma ação pendente!"

        critical = sum(1 for a in actions if a.priority == "critical")
        high = sum(1 for a in actions if a.priority == "high")

        message = f"{EMOJI_WARNING} {len(actions)} ações pendentes\n"

        if critical > 0:
            message += f"  🚨 {critical} críticas\n"
        if high > 0:
            message += f"  🔴 {high} importantes\n"

        return message

    def _format_sync_success_message(self, sync_log: SyncLog, stats: dict[str, int]) -> str:
        """Formata mensagem de sincronização bem-sucedida"""
        platform = sync_log.calendar_source.platform.value.upper()

        message = f"{EMOJI_SYNC} Sincronização {platform} concluída\n\n"

        if stats["added"] > 0:
            message += f"{EMOJI_NEW} {stats['added']} nova(s) reserva(s)\n"
        if stats["updated"] > 0:
            message += f"🔄 {stats['updated']} atualizada(s)\n"
        if stats["cancelled"] > 0:
            message += f"🚫 {stats['cancelled']} cancelada(s)\n"

        if sync_log.conflicts_detected > 0:
            message += f"\n{EMOJI_CONFLICT} {sync_log.conflicts_detected} conflito(s) detectado(s)!"

        duration_sec = sync_log.sync_duration_ms / 1000 if sync_log.sync_duration_ms else 0
        message += f"\n\n⏱️ Duração: {duration_sec:.1f}s"

        return message

    def _format_sync_error_message(self, sync_log: SyncLog) -> str:
        """Formata mensagem de erro na sincronização"""
        platform = sync_log.calendar_source.platform.value.upper()

        message = f"{EMOJI_ERROR} Erro na sincronização {platform}\n\n"
        message += f"Erro: {sync_log.error_message or 'Erro desconhecido'}\n"
        message += "\nVerifique os logs para mais detalhes."

        return message

    def _format_conflict_message(self, conflict: BookingConflict) -> str:
        """Formata mensagem de conflito"""
        booking1 = conflict.booking_1
        booking2 = conflict.booking_2

        platform1 = booking1.platform.upper()
        platform2 = booking2.platform.upper()

        emoji1 = EMOJI_AIRBNB if platform1 == "AIRBNB" else EMOJI_BOOKING
        emoji2 = EMOJI_AIRBNB if platform2 == "AIRBNB" else EMOJI_BOOKING

        severity_emoji = {"critical": "🚨", "high": "🔴", "medium": "⚠️", "low": "ℹ️"}.get(conflict.severity, "⚠️")

        message = f"{severity_emoji} CONFLITO DETECTADO - {conflict.severity.upper()}\n\n"

        message += f"{emoji1} {platform1}: {booking1.guest_name}\n"
        message += f"   {format_date_range(booking1.check_in_date, booking1.check_out_date)}\n\n"

        message += f"{emoji2} {platform2}: {booking2.guest_name}\n"
        message += f"   {format_date_range(booking2.check_in_date, booking2.check_out_date)}\n\n"

        if conflict.overlap_start and conflict.overlap_end:
            message += f"Sobreposição: {format_date_range(conflict.overlap_start, conflict.overlap_end)}\n"
            message += f"Noites em conflito: {conflict.overlap_nights}\n"

        message += f"\n{EMOJI_WARNING} AÇÃO NECESSÁRIA!"

        return message

    def _format_new_booking_message(self, booking: Booking) -> str:
        """Formata mensagem de nova reserva"""
        platform = booking.platform.upper()

        message = f"{EMOJI_NEW} Nova Reserva - {platform}\n\n"
        message += f"👤 {booking.guest_name}\n"
        message += f"📅 {format_date_range(booking.check_in_date, booking.check_out_date)}\n"

        if booking.guest_count > 1:
            message += f"👥 {booking.guest_count} hóspedes\n"

        if booking.total_price:
            currency_symbol = "R$" if booking.currency == "BRL" else booking.currency
            message += f"💰 {currency_symbol} {booking.total_price:.2f}\n"

        return message

    def _format_sync_action_message(self, action: SyncAction) -> str:
        """Formata mensagem de ação de sincronização"""
        priority_emoji = action.priority_emoji

        message = f"{priority_emoji} AÇÃO NECESSÁRIA\n\n"
        message += action.get_action_description() + "\n\n"
        message += f"Motivo:\n{action.reason}\n"

        if action.action_url:
            message += f"\n🔗 Link: {action.action_url}"

        return message

    # Métodos para estatísticas

    def format_dashboard_summary(
        self,
        current_booking: Booking | None,
        next_bookings: list[Booking],
        pending_actions: list[SyncAction],
        active_conflicts: list[BookingConflict],
    ) -> str:
        """
        Formata resumo do dashboard para exibição.

        Args:
            current_booking: Reserva atual (hóspede no momento)
            next_bookings: Próximas reservas
            pending_actions: Ações pendentes
            active_conflicts: Conflitos ativos

        Returns:
            Mensagem formatada
        """
        message = "📊 DASHBOARD LUMINA\n"
        message += "=" * 40 + "\n\n"

        # Hóspede atual
        if current_booking:
            message += "📍 HÓSPEDE ATUAL\n"
            message += f"   {current_booking.guest_name}\n"
            message += f"   Check-out: {format_date_short(current_booking.check_out_date)}\n"
            message += f"   Plataforma: {current_booking.platform.upper()}\n\n"
        else:
            message += "📍 Apartamento VAZIO\n\n"

        # Próximas reservas
        if next_bookings:
            message += f"📅 PRÓXIMAS RESERVAS ({len(next_bookings)})\n"
            for booking in next_bookings[:3]:  # Mostrar até 3
                emoji = EMOJI_AIRBNB if booking.platform == "airbnb" else EMOJI_BOOKING
                message += f"   {emoji} {format_date_short(booking.check_in_date)}: {booking.guest_name}\n"
            message += "\n"
        else:
            message += "📅 Nenhuma reserva futura\n\n"

        # Conflitos
        if active_conflicts:
            message += f"{EMOJI_CONFLICT} CONFLITOS ATIVOS: {len(active_conflicts)}\n"
            critical = sum(1 for c in active_conflicts if c.severity == "critical")
            if critical > 0:
                message += f"   🚨 {critical} CRÍTICOS!\n"
            message += "\n"

        # Ações pendentes
        if pending_actions:
            message += self.get_pending_actions_summary(pending_actions)
        else:
            message += f"{EMOJI_SUCCESS} Nenhuma ação pendente\n"

        message += "\n" + "=" * 40

        return message
