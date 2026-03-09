"""
Serviço de notificações via Telegram.
Envia alertas sobre conflitos, check-ins, check-outs e eventos importantes.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.error import TelegramError

from app.config import settings
from app.models.booking import Booking
from app.models.booking_conflict import BookingConflict
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NotificationService:
    """Serviço para enviar notificações via Telegram"""

    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.admin_ids = settings.admin_user_ids
        self.bot: Optional[Bot] = None

        if self.token and self.token != "":
            self.bot = Bot(token=self.token)

    async def send_to_admins(self, message: str, parse_mode: str = "Markdown") -> bool:
        """Envia mensagem para todos os admins"""
        if not self.bot or not self.admin_ids:
            return False

        success = True
        for admin_id in self.admin_ids:
            try:
                await self.bot.send_message(
                    chat_id=admin_id, text=message, parse_mode=parse_mode
                )
            except TelegramError as e:
                logger.error(f"[ERR] Erro ao enviar mensagem no Telegram - API ou permissoes falharam.")
                success = False

        return success

    async def send_to_admins_with_keyboard(
        self, message: str, reply_markup: InlineKeyboardMarkup, parse_mode: str = "Markdown"
    ) -> bool:
        """Envia mensagem com botoes inline para todos os admins"""
        if not self.bot or not self.admin_ids:
            return False

        success = True
        for admin_id in self.admin_ids:
            try:
                await self.bot.send_message(
                    chat_id=admin_id,
                    text=message,
                    parse_mode=parse_mode,
                    reply_markup=reply_markup
                )
            except TelegramError as e:
                logger.error(f"[ERR] Erro ao enviar mensagem com teclado no Telegram - API ou permissoes falharam.")
                success = False

        return success

    async def notify_new_booking(self, booking: Booking) -> bool:
        """Notifica sobre nova reserva com botoes de aprovacao"""
        platform_emoji = self._get_platform_emoji(booking.platform)

        message = (
            f"🆕 **Nova Reserva Detectada!**\n\n"
            f"{platform_emoji} Plataforma: {booking.platform.upper()}\n"
            f"👤 Hóspede: {booking.guest_name}\n"
            f"📆 Check-in: {booking.check_in_date.strftime('%d/%m/%Y')}\n"
            f"📆 Check-out: {booking.check_out_date.strftime('%d/%m/%Y')}\n"
            f"🌙 Noites: {booking.nights_count}\n"
            f"👥 Hóspedes: {booking.guest_count}\n"
        )

        if booking.total_price:
            message += f"💰 Valor: R$ {booking.total_price:.2f}\n"

        # Se tem booking.id, adicionar botoes de aprovacao
        if booking.id:
            message += "\n📝 Deseja autorizar hospedagem no condomínio?"
            keyboard = InlineKeyboardMarkup([
                [
                    InlineKeyboardButton(
                        "✅ Autorizar",
                        callback_data=f"approve_booking_{booking.id}"
                    ),
                    InlineKeyboardButton(
                        "❌ Ignorar",
                        callback_data=f"ignore_booking_{booking.id}"
                    ),
                ]
            ])
            return await self.send_to_admins_with_keyboard(message, keyboard)

        return await self.send_to_admins(message)

    async def notify_booking_update(self, booking: Booking, changes: dict) -> bool:
        """Notifica sobre atualização de reserva"""
        platform_emoji = self._get_platform_emoji(booking.platform)

        message = (
            f"🔄 **Reserva Atualizada**\n\n"
            f"{platform_emoji} {booking.guest_name}\n"
            f"📆 {booking.check_in_date.strftime('%d/%m')} → "
            f"{booking.check_out_date.strftime('%d/%m')}\n\n"
            f"**Mudanças:**\n"
        )

        for field, (old, new) in changes.items():
            message += f"• {field}: {old} → {new}\n"

        return await self.send_to_admins(message)

    async def notify_booking_cancelled(self, booking: Booking) -> bool:
        """Notifica sobre cancelamento de reserva"""
        platform_emoji = self._get_platform_emoji(booking.platform)

        message = (
            f"❌ **Reserva Cancelada**\n\n"
            f"{platform_emoji} {booking.guest_name}\n"
            f"📆 {booking.check_in_date.strftime('%d/%m/%Y')} → "
            f"{booking.check_out_date.strftime('%d/%m/%Y')}\n"
            f"🌙 {booking.nights_count} noite(s)\n\n"
            f"💡 O período agora está disponível para novas reservas."
        )

        return await self.send_to_admins(message)

    async def notify_conflict_detected(self, conflicts: List[BookingConflict]) -> bool:
        """Notifica sobre conflitos detectados"""
        if not conflicts:
            return True

        message = f"⚠️ **{len(conflicts)} Conflito(s) Detectado(s)!**\n\n"

        for conflict in conflicts[:5]:  # Limitar a 5 conflitos
            severity_emoji = self._get_severity_emoji(conflict.severity)
            type_text = "Duplicata" if conflict.conflict_type == "duplicate" else "Sobreposição"

            message += (
                f"{severity_emoji} **{type_text}** ({conflict.severity})\n"
                f"  📅 {conflict.booking_1.guest_name}\n"
                f"  📅 {conflict.booking_2.guest_name}\n"
                f"  🗓 {conflict.booking_1.check_in_date.strftime('%d/%m')} → "
                f"{conflict.booking_1.check_out_date.strftime('%d/%m')}\n\n"
            )

        if len(conflicts) > 5:
            message += f"... e mais {len(conflicts) - 5} conflito(s)\n\n"

        message += "🔧 Resolva os conflitos na interface web ou use /conflitos"

        return await self.send_to_admins(message)

    async def notify_conflict_resolved(self, conflict: BookingConflict) -> bool:
        """Notifica sobre resolução de conflito"""
        message = (
            f"✅ **Conflito Resolvido**\n\n"
            f"📅 {conflict.booking_1.guest_name} vs {conflict.booking_2.guest_name}\n"
        )

        if conflict.resolution_notes:
            message += f"\n📝 Notas: {conflict.resolution_notes}"

        return await self.send_to_admins(message)

    async def notify_checkin_reminder(self, bookings: List[Booking]) -> bool:
        """Notifica sobre check-ins próximos (1 dia antes)"""
        if not bookings:
            return True

        message = f"🔔 **Lembrete: {len(bookings)} Check-in(s) Amanhã**\n\n"

        for booking in bookings:
            platform_emoji = self._get_platform_emoji(booking.platform)
            message += (
                f"{platform_emoji} **{booking.guest_name}**\n"
                f"  👥 {booking.guest_count} hóspede(s)\n"
                f"  🌙 {booking.nights_count} noite(s)\n\n"
            )

        message += "📝 Prepare o apartamento para receber os hóspedes!"

        return await self.send_to_admins(message)

    async def notify_checkout_reminder(self, bookings: List[Booking]) -> bool:
        """Notifica sobre check-outs de hoje"""
        if not bookings:
            return True

        message = f"🔔 **Check-out(s) Hoje: {len(bookings)}**\n\n"

        for booking in bookings:
            platform_emoji = self._get_platform_emoji(booking.platform)
            message += (
                f"{platform_emoji} **{booking.guest_name}**\n"
                f"  🕐 Liberar apartamento\n\n"
            )

        message += "🧹 Prepare o apartamento para limpeza e vistoria!"

        return await self.send_to_admins(message)

    async def notify_sync_completed(
        self, new_count: int, updated_count: int, conflicts_count: int
    ) -> bool:
        """Notifica sobre sincronização concluída"""
        if new_count == 0 and updated_count == 0 and conflicts_count == 0:
            return True  # Não notificar se não houve mudanças

        message = (
            f"✅ **Sincronização Automática Concluída**\n\n"
            f"📥 Novas reservas: {new_count}\n"
            f"🔄 Atualizadas: {updated_count}\n"
            f"⚠️ Conflitos: {conflicts_count}\n\n"
            f"🕐 {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        )

        if conflicts_count > 0:
            message += "\n\n💡 Use /conflitos para ver detalhes"

        return await self.send_to_admins(message)

    async def notify_sync_error(self, error_message: str) -> bool:
        """Notifica sobre erro na sincronização"""
        message = (
            f"❌ **Erro na Sincronização Automática**\n\n"
            f"🔧 Erro: {error_message}\n\n"
            f"💡 Verifique as configurações do calendário ou tente sincronizar manualmente."
        )

        return await self.send_to_admins(message)

    async def send_daily_summary(
        self,
        total_bookings: int,
        active_bookings: int,
        conflicts_count: int,
        checkins_today: int,
        checkouts_today: int,
        revenue_month: float,
    ) -> bool:
        """Envia resumo diário"""
        message = (
            f"📊 **Resumo Diário** - {datetime.now().strftime('%d/%m/%Y')}\n\n"
            f"📅 Total de Reservas: {total_bookings}\n"
            f"✅ Reservas Ativas: {active_bookings}\n"
            f"⚠️ Conflitos: {conflicts_count}\n\n"
            f"🟢 Check-ins Hoje: {checkins_today}\n"
            f"🟡 Check-outs Hoje: {checkouts_today}\n\n"
            f"💰 Receita do Mês: R$ {revenue_month:.2f}\n\n"
            f"🔗 Acesse o painel: http://localhost:5173"
        )

        return await self.send_to_admins(message)

    def _get_platform_emoji(self, platform: str) -> str:
        """Retorna emoji para a plataforma"""
        emojis = {
            "airbnb": "🔴",
            "booking": "🔵",
            "manual": "⚪",
        }
        return emojis.get(platform, "⚫")

    def _get_severity_emoji(self, severity: str) -> str:
        """Retorna emoji para severidade"""
        emojis = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🟢",
        }
        return emojis.get(severity, "⚪")
