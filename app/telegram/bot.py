"""
Bot do Telegram para gerenciamento de apartamento.
Fornece comandos para visualizar reservas, conflitos e receber notificações.
"""
import asyncio
from datetime import datetime
from typing import Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import get_db
from app.database.session import get_db_context
from app.models.booking import Booking
from app.models.booking_conflict import BookingConflict
from app.models.property import Property
from app.core.conflict_detector import ConflictDetector
from app.services.document_service import DocumentService
from app.services.email_service import get_email_service
from app.services.notification_db_service import NotificationDBService
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TelegramBot:
    """Bot do Telegram para gerenciamento de apartamento"""

    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.admin_ids = settings.admin_user_ids
        self.application: Optional[Application] = None
        self._running = False

    async def start(self):
        """Inicia o bot"""
        if not self.token or self.token == "":
            print("[WARN] TELEGRAM_BOT_TOKEN nao configurado. Bot nao sera iniciado.")
            return

        if not self.admin_ids:
            print("[WARN] TELEGRAM_ADMIN_USER_IDS nao configurado. Bot nao sera iniciado.")
            return

        # Criar aplicação
        self.application = Application.builder().token(self.token).build()

        # Registrar handlers
        self._register_handlers()

        # Iniciar bot
        print("[BOT] Iniciando bot do Telegram...")
        await self.application.initialize()
        await self.application.start()
        await self.application.updater.start_polling()
        self._running = True
        print("[OK] Bot do Telegram iniciado com sucesso!")

    async def stop(self):
        """Para o bot"""
        if self.application and self._running:
            print("[BOT] Parando bot do Telegram...")
            await self.application.updater.stop()
            await self.application.stop()
            await self.application.shutdown()
            self._running = False
            print("[OK] Bot do Telegram parado!")

    def _register_handlers(self):
        """Registra todos os handlers de comandos"""
        # Comandos básicos
        self.application.add_handler(CommandHandler("start", self._cmd_start))
        self.application.add_handler(CommandHandler("help", self._cmd_help))
        self.application.add_handler(CommandHandler("menu", self._cmd_menu))

        # Comandos de informação
        self.application.add_handler(CommandHandler("status", self._cmd_status))
        self.application.add_handler(CommandHandler("reservas", self._cmd_reservas))
        self.application.add_handler(CommandHandler("hoje", self._cmd_hoje))
        self.application.add_handler(CommandHandler("proximas", self._cmd_proximas))
        self.application.add_handler(CommandHandler("conflitos", self._cmd_conflitos))

        # Comandos de ação
        self.application.add_handler(CommandHandler("sync", self._cmd_sync))

        # Callback queries (botões inline)
        self.application.add_handler(CallbackQueryHandler(self._handle_callback))

        # Handler de mensagens desconhecidas
        self.application.add_handler(
            MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_message)
        )

    def _check_admin(self, user_id: int) -> bool:
        """Verifica se o usuário é admin"""
        return user_id in self.admin_ids

    async def _cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /start - Boas-vindas"""
        user = update.effective_user
        if not self._check_admin(user.id):
            await update.message.reply_text(
                "❌ Você não tem permissão para usar este bot.\n"
                f"Seu ID: {user.id}"
            )
            return

        welcome_text = (
            f"👋 Olá, {user.first_name}!\n\n"
            "🏢 Bem-vindo ao **LUMINA** - Sistema de Gerenciamento de Apartamento\n\n"
            "Aqui você pode:\n"
            "• Ver status das reservas\n"
            "• Verificar conflitos\n"
            "• Sincronizar calendários\n"
            "• Receber notificações importantes\n\n"
            "Digite /help para ver todos os comandos disponíveis."
        )

        await update.message.reply_text(
            welcome_text,
            parse_mode="Markdown",
            reply_markup=self._get_main_menu_keyboard(),
        )

    async def _cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /help - Lista de comandos"""
        if not self._check_admin(update.effective_user.id):
            return

        help_text = (
            "📋 **Comandos Disponíveis:**\n\n"
            "**Informações:**\n"
            "/status - Status geral do sistema\n"
            "/reservas - Lista todas as reservas\n"
            "/hoje - Check-ins e check-outs de hoje\n"
            "/proximas - Próximas 5 reservas\n"
            "/conflitos - Conflitos detectados\n\n"
            "**Ações:**\n"
            "/sync - Sincronizar calendários agora\n\n"
            "**Outros:**\n"
            "/menu - Menu principal\n"
            "/help - Esta mensagem\n\n"
            "💡 Use os botões do menu para navegar facilmente!"
        )

        await update.message.reply_text(help_text, parse_mode="Markdown")

    async def _cmd_menu(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /menu - Menu principal"""
        if not self._check_admin(update.effective_user.id):
            return

        await update.message.reply_text(
            "🏠 **Menu Principal**\n\nEscolha uma opção:",
            parse_mode="Markdown",
            reply_markup=self._get_main_menu_keyboard(),
        )

    async def _cmd_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /status - Status do sistema"""
        if not self._check_admin(update.effective_user.id):
            return

        db: Session = next(get_db())
        try:
            # Buscar dados
            property_obj = db.query(Property).first()
            total_bookings = db.query(Booking).count()
            active_bookings = (
                db.query(Booking).filter(Booking.status == "confirmed").count()
            )
            conflicts_count = (
                db.query(BookingConflict).filter(BookingConflict.resolved == False).count()
            )

            # Montar mensagem
            status_text = (
                "📊 **Status do Sistema**\n\n"
                f"🏢 Apartamento: {property_obj.name if property_obj else 'N/A'}\n"
                f"📅 Total de Reservas: {total_bookings}\n"
                f"✅ Reservas Ativas: {active_bookings}\n"
                f"⚠️ Conflitos: {conflicts_count}\n\n"
                f"🕐 Atualizado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            )

            await update.message.reply_text(status_text, parse_mode="Markdown")
        finally:
            db.close()

    async def _cmd_reservas(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /reservas - Lista reservas confirmadas"""
        if not self._check_admin(update.effective_user.id):
            return

        db: Session = next(get_db())
        try:
            bookings = (
                db.query(Booking)
                .filter(Booking.status == "confirmed")
                .order_by(Booking.check_in_date)
                .limit(10)
                .all()
            )

            if not bookings:
                await update.message.reply_text("📭 Nenhuma reserva confirmada encontrada.")
                return

            text = f"📅 **Reservas Confirmadas** (10 mais próximas)\n\n"
            for booking in bookings:
                platform_emoji = self._get_platform_emoji(booking.platform)
                text += (
                    f"{platform_emoji} **{booking.guest_name}**\n"
                    f"  📆 {booking.check_in_date.strftime('%d/%m')} → "
                    f"{booking.check_out_date.strftime('%d/%m')} "
                    f"({booking.nights_count} noites)\n"
                    f"  👥 {booking.guest_count} hóspede(s)\n"
                )
                if booking.total_price:
                    text += f"  💰 R$ {booking.total_price:.2f}\n"
                text += "\n"

            await update.message.reply_text(text, parse_mode="Markdown")
        finally:
            db.close()

    async def _cmd_hoje(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /hoje - Check-ins e check-outs de hoje"""
        if not self._check_admin(update.effective_user.id):
            return

        db: Session = next(get_db())
        try:
            today = datetime.now().date()

            checkins = (
                db.query(Booking)
                .filter(
                    Booking.check_in_date == today,
                    Booking.status == "confirmed",
                )
                .all()
            )

            checkouts = (
                db.query(Booking)
                .filter(
                    Booking.check_out_date == today,
                    Booking.status == "confirmed",
                )
                .all()
            )

            text = f"📅 **Atividades de Hoje** - {today.strftime('%d/%m/%Y')}\n\n"

            if checkins:
                text += "🟢 **CHECK-INS:**\n"
                for booking in checkins:
                    platform_emoji = self._get_platform_emoji(booking.platform)
                    text += (
                        f"{platform_emoji} {booking.guest_name} "
                        f"({booking.guest_count} hóspede(s))\n"
                    )
                text += "\n"
            else:
                text += "🟢 **CHECK-INS:** Nenhum\n\n"

            if checkouts:
                text += "🟡 **CHECK-OUTS:**\n"
                for booking in checkouts:
                    platform_emoji = self._get_platform_emoji(booking.platform)
                    text += f"{platform_emoji} {booking.guest_name}\n"
                text += "\n"
            else:
                text += "🟡 **CHECK-OUTS:** Nenhum\n\n"

            if not checkins and not checkouts:
                text += "✨ Nenhuma atividade para hoje!"

            await update.message.reply_text(text, parse_mode="Markdown")
        finally:
            db.close()

    async def _cmd_proximas(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /proximas - Próximas 5 reservas"""
        if not self._check_admin(update.effective_user.id):
            return

        db: Session = next(get_db())
        try:
            now = datetime.now().date()
            bookings = (
                db.query(Booking)
                .filter(
                    Booking.check_in_date >= now,
                    Booking.status == "confirmed",
                )
                .order_by(Booking.check_in_date)
                .limit(5)
                .all()
            )

            if not bookings:
                await update.message.reply_text("📭 Nenhuma reserva futura encontrada.")
                return

            text = "🔜 **Próximas 5 Reservas**\n\n"
            for booking in bookings:
                platform_emoji = self._get_platform_emoji(booking.platform)
                days_until = (booking.check_in_date - now).days
                text += (
                    f"{platform_emoji} **{booking.guest_name}**\n"
                    f"  📆 Check-in: {booking.check_in_date.strftime('%d/%m/%Y')} "
                    f"({days_until} dia(s))\n"
                    f"  🌙 {booking.nights_count} noite(s)\n"
                    f"  👥 {booking.guest_count} hóspede(s)\n\n"
                )

            await update.message.reply_text(text, parse_mode="Markdown")
        finally:
            db.close()

    async def _cmd_conflitos(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /conflitos - Lista conflitos ativos"""
        if not self._check_admin(update.effective_user.id):
            return

        db: Session = next(get_db())
        try:
            conflicts = (
                db.query(BookingConflict)
                .filter(BookingConflict.resolved == False)
                .all()
            )

            if not conflicts:
                await update.message.reply_text("✅ Nenhum conflito detectado!")
                return

            text = f"⚠️ **Conflitos Detectados** ({len(conflicts)})\n\n"

            for conflict in conflicts:
                severity_emoji = self._get_severity_emoji(conflict.severity)
                type_text = "Duplicata" if conflict.conflict_type == "duplicate" else "Sobreposição"

                text += (
                    f"{severity_emoji} **{type_text}** - {conflict.severity.upper()}\n"
                    f"  📅 Reserva 1: {conflict.booking_1.guest_name}\n"
                    f"  📅 Reserva 2: {conflict.booking_2.guest_name}\n"
                    f"  🗓 Período: {conflict.booking_1.check_in_date.strftime('%d/%m')} → "
                    f"{conflict.booking_1.check_out_date.strftime('%d/%m')}\n\n"
                )

            text += "💡 Resolva os conflitos na interface web."

            await update.message.reply_text(text, parse_mode="Markdown")
        finally:
            db.close()

    async def _cmd_sync(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Comando /sync - Sincroniza calendários"""
        if not self._check_admin(update.effective_user.id):
            return

        await update.message.reply_text("🔄 Iniciando sincronização dos calendários...")

        db: Session = next(get_db())
        try:
            from app.services.calendar_service import CalendarService
            # Sincronizar
            sync = CalendarService(db)
            properties = db.query(Property).all()
            results = []
            conflicts = []
            detector = ConflictDetector(db)
            
            for prop in properties:
                res = await sync.sync_all_sources(prop.id)
                if res.get("success"):
                    results.append({
                        "new_bookings": res.get("total_stats", {}).get("bookings_added", 0),
                        "updated_bookings": res.get("total_stats", {}).get("bookings_updated", 0)
                    })
                # Detectar conflitos
                prop_conflicts = detector.detect_all_conflicts(prop.id)
                conflicts.extend(prop_conflicts)

            # Montar resposta
            total_new = sum(r["new_bookings"] for r in results)
            total_updated = sum(r["updated_bookings"] for r in results)
            total_conflicts = len(conflicts)

            text = (
                "✅ **Sincronização Concluída!**\n\n"
                f"📥 Novas reservas: {total_new}\n"
                f"🔄 Atualizadas: {total_updated}\n"
                f"⚠️ Conflitos: {total_conflicts}\n\n"
                f"🕐 {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            )

            if total_conflicts > 0:
                text += "\n\n💡 Use /conflitos para ver detalhes"

            await update.message.reply_text(text, parse_mode="Markdown")
        except Exception as e:
            await update.message.reply_text(f"❌ Erro na sincronização: {str(e)}")
        finally:
            db.close()

    async def _handle_callback(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ):
        """Handler para botões inline"""
        query = update.callback_query
        await query.answer()

        data = query.data

        # Roteamento por prefixo para botoes de aprovacao/rejeicao
        if data.startswith("approve_booking_"):
            booking_id = int(data.replace("approve_booking_", ""))
            await self._handle_approve_booking(query, booking_id)
            return

        if data.startswith("ignore_booking_"):
            booking_id = int(data.replace("ignore_booking_", ""))
            await self._handle_ignore_booking(query, booking_id)
            return

        # Mapear callbacks para comandos
        callback_map = {
            "status": self._cmd_status,
            "reservas": self._cmd_reservas,
            "hoje": self._cmd_hoje,
            "proximas": self._cmd_proximas,
            "conflitos": self._cmd_conflitos,
            "sync": self._cmd_sync,
            "menu": self._cmd_menu,
        }

        handler = callback_map.get(data)
        if handler:
            # Criar update fake para reusar handlers
            update.message = query.message
            await handler(update, context)

    async def _handle_approve_booking(self, query, booking_id: int):
        """Processa aprovacao de reserva: gera documento e envia email ao condominio"""
        try:
            with get_db_context() as db:
                # Buscar reserva
                booking = db.query(Booking).filter(Booking.id == booking_id).first()

                if not booking:
                    await query.edit_message_text(
                        f"❌ Reserva #{booking_id} não encontrada."
                    )
                    return

                await query.edit_message_text(
                    f"⏳ Gerando documento de autorização para {booking.guest_name}..."
                )

                # Gerar documento
                doc_service = DocumentService()
                booking_data = {
                    "id": booking.id,
                    "check_in": booking.check_in_date,
                    "check_out": booking.check_out_date,
                }
                property_data = {
                    "name": settings.PROPERTY_NAME,
                    "address": settings.PROPERTY_ADDRESS,
                    "condo_name": settings.CONDO_NAME,
                    "owner_name": settings.OWNER_NAME,
                }
                guest_data = {
                    "name": booking.guest_name or "Hóspede",
                    "cpf": "",
                    "phone": "",
                    "email": "",
                }

                result = doc_service.generate_condo_authorization(
                    booking_data=booking_data,
                    property_data=property_data,
                    guest_data=guest_data,
                    save_to_file=True
                )

                if not result["success"]:
                    await query.edit_message_text(
                        f"❌ Erro ao gerar documento: {result['message']}"
                    )
                    return

                filename = result.get("filename", "")
                file_path = result.get("file_path", "")

                # Verificar se condo_email esta configurado
                if not settings.CONDO_EMAIL:
                    await query.edit_message_text(
                        f"✅ Documento gerado: {filename}\n\n"
                        f"⚠️ Email do condomínio não configurado.\n"
                        f"Configure CONDO_EMAIL no .env para envio automático.\n"
                        f"O documento está salvo em: {file_path}"
                    )
                    return

                # Verificar se email esta configurado
                email_service = get_email_service(
                    provider=settings.EMAIL_PROVIDER,
                    username=settings.EMAIL_FROM,
                    password=settings.EMAIL_PASSWORD
                )

                if not email_service:
                    await query.edit_message_text(
                        f"✅ Documento gerado: {filename}\n\n"
                        f"⚠️ Serviço de email não configurado.\n"
                        f"Configure EMAIL_FROM e EMAIL_PASSWORD no .env.\n"
                        f"O documento está salvo em: {file_path}"
                    )
                    return

                # Ler arquivo para anexo
                from pathlib import Path
                doc_path = Path(file_path)
                if not doc_path.exists():
                    await query.edit_message_text(
                        f"✅ Documento gerado mas arquivo não encontrado para envio.\n"
                        f"Caminho: {file_path}"
                    )
                    return

                file_bytes = doc_path.read_bytes()

                # Enviar email ao condominio
                check_in_str = booking.check_in_date.strftime('%d/%m/%Y')
                check_out_str = booking.check_out_date.strftime('%d/%m/%Y')

                email_result = await email_service.send_email(
                    to=[settings.CONDO_EMAIL],
                    subject=f"Autorização de Hospedagem - {booking.guest_name} - {check_in_str} a {check_out_str}",
                    body=(
                        f"Prezada Administração,\n\n"
                        f"Segue em anexo a autorização de hospedagem para:\n\n"
                        f"Hóspede: {booking.guest_name}\n"
                        f"Check-in: {check_in_str}\n"
                        f"Check-out: {check_out_str}\n"
                        f"Imóvel: {settings.PROPERTY_NAME}\n\n"
                        f"Atenciosamente,\n"
                        f"{settings.OWNER_NAME}\n"
                        f"Tel: {settings.OWNER_PHONE}"
                    ),
                    attachments=[{
                        "filename": filename,
                        "content": file_bytes
                    }]
                )

                if email_result.get("success"):
                    await query.edit_message_text(
                        f"✅ **Autorização Enviada!**\n\n"
                        f"👤 Hóspede: {booking.guest_name}\n"
                        f"📆 {check_in_str} → {check_out_str}\n"
                        f"📄 Documento: {filename}\n"
                        f"📧 Enviado para: {settings.CONDO_EMAIL}\n\n"
                        f"O condomínio receberá a autorização em breve.",
                        parse_mode="Markdown"
                    )
                    logger.info(f"Authorization sent for booking {booking_id} to {settings.CONDO_EMAIL}")

                    # Notificações no banco de dados
                    notif_db = NotificationDBService(db)
                    notif_db.create(
                        type="document",
                        title=f"Documento gerado: {booking.guest_name}",
                        message=f"Autorização de hospedagem gerada: {filename}",
                        booking_id=booking_id,
                    )
                    notif_db.create(
                        type="email",
                        title=f"Email enviado ao condomínio",
                        message=f"Autorização de {booking.guest_name} enviada para {settings.CONDO_EMAIL}",
                        booking_id=booking_id,
                    )
                else:
                    error_msg = email_result.get("message", "Erro desconhecido")
                    await query.edit_message_text(
                        f"✅ Documento gerado: {filename}\n\n"
                        f"❌ Erro ao enviar email: {error_msg}\n"
                        f"O documento está salvo em: {file_path}"
                    )
                    logger.error(f"Failed to send email for booking {booking_id}: {error_msg}")

                    # Notificação de documento gerado (sem email)
                    notif_db = NotificationDBService(db)
                    notif_db.create(
                        type="document",
                        title=f"Documento gerado: {booking.guest_name}",
                        message=f"Autorização gerada ({filename}) mas erro ao enviar email: {error_msg}",
                        booking_id=booking_id,
                    )

        except Exception as e:
            logger.error(f"Error approving booking {booking_id}: {e}", exc_info=True)
            try:
                await query.edit_message_text(
                    f"❌ Erro ao processar autorização: {str(e)}"
                )
            except Exception:
                pass

    async def _handle_ignore_booking(self, query, booking_id: int):
        """Processa rejeicao de reserva"""
        try:
            await query.edit_message_text(
                f"⏭️ Reserva #{booking_id} ignorada.\n"
                f"Nenhum documento será gerado para esta reserva."
            )
            logger.info(f"Booking {booking_id} ignored by admin")
        except Exception as e:
            logger.error(f"Error ignoring booking {booking_id}: {e}")

    async def _handle_message(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ):
        """Handler para mensagens de texto"""
        if not self._check_admin(update.effective_user.id):
            return

        await update.message.reply_text(
            "❓ Comando não reconhecido.\n"
            "Digite /help para ver os comandos disponíveis."
        )

    def _get_main_menu_keyboard(self) -> InlineKeyboardMarkup:
        """Retorna teclado do menu principal"""
        keyboard = [
            [
                InlineKeyboardButton("📊 Status", callback_data="status"),
                InlineKeyboardButton("📅 Reservas", callback_data="reservas"),
            ],
            [
                InlineKeyboardButton("📆 Hoje", callback_data="hoje"),
                InlineKeyboardButton("🔜 Próximas", callback_data="proximas"),
            ],
            [
                InlineKeyboardButton("⚠️ Conflitos", callback_data="conflitos"),
                InlineKeyboardButton("🔄 Sincronizar", callback_data="sync"),
            ],
        ]
        return InlineKeyboardMarkup(keyboard)

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
