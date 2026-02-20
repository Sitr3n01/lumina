# app/services/sync_action_service.py
"""
Serviço de gerenciamento de ações de sincronização.
Cria, gerencia e acompanha ações que o usuário precisa executar manualmente nas plataformas.
Também executa ações automáticas (como envio de emails e geração de documentos).
"""
import asyncio
from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.sync_action import SyncAction, ActionType, ActionStatus, TargetPlatform
from app.models.booking import Booking
from app.services.document_service import DocumentService
from app.services.email_service import get_email_service
from app.utils.logger import get_logger
from app.config import settings

logger = get_logger(__name__)


class SyncActionService:
    """Serviço para gerenciar ações de sincronização entre plataformas"""

    def __init__(self, db: Session):
        self.db = db
        self.document_service = DocumentService()
        self.email_service = get_email_service()

    def create_block_action(
        self,
        property_id: int,
        start_date: date,
        end_date: date,
        target_platform: TargetPlatform,
        reason: str,
        trigger_booking: Optional[Booking] = None,
        priority: str = "high"
    ) -> SyncAction:
        """
        Cria uma ação de bloqueio de datas.
        """
        logger.info(f"Creating block action for {target_platform.value}: {start_date} to {end_date}")

        # Gerar URL de ação (se possível)
        action_url = self._generate_block_url(target_platform, start_date, end_date)

        action = SyncAction(
            property_id=property_id,
            trigger_booking_id=trigger_booking.id if trigger_booking else None,
            action_type=ActionType.BLOCK_DATES,
            status=ActionStatus.PENDING,
            target_platform=target_platform,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            action_url=action_url,
            priority=priority,
            auto_dismiss_after_hours=72  # Ações de bloqueio expiram em 3 dias
        )

        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)

        logger.info(f"✅ Block action created: ID={action.id}")
        return action

    def create_cancel_action(
        self,
        property_id: int,
        booking: Booking,
        reason: str,
        priority: str = "critical"
    ) -> SyncAction:
        """
        Cria uma ação de cancelamento de reserva.
        """
        logger.info(f"Creating cancel action for booking {booking.id}")

        # Determinar plataforma
        target_platform = TargetPlatform.AIRBNB if booking.platform == "airbnb" else TargetPlatform.BOOKING

        # URL de ação
        action_url = self._generate_cancel_url(booking)

        action = SyncAction(
            property_id=property_id,
            trigger_booking_id=booking.id,
            action_type=ActionType.CANCEL_BOOKING,
            status=ActionStatus.PENDING,
            target_platform=target_platform,
            reason=reason,
            action_url=action_url,
            priority=priority,
            auto_dismiss_after_hours=24  # Cancelamentos expiram em 24h
        )

        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)

        logger.info(f"✅ Cancel action created: ID={action.id}")
        return action

    def get_pending_actions(self, property_id: int) -> List[SyncAction]:
        """
        Retorna todas as ações pendentes de um imóvel.
        """
        return self.db.query(SyncAction).filter(
            and_(
                SyncAction.property_id == property_id,
                SyncAction.status == ActionStatus.PENDING
            )
        ).order_by(
            # Ordenar por prioridade (crítico primeiro)
            SyncAction.priority.desc(),
            SyncAction.created_at.asc()
        ).all()

    def get_action_by_id(self, action_id: int) -> Optional[SyncAction]:
        """Busca uma ação por ID"""
        return self.db.query(SyncAction).filter(SyncAction.id == action_id).first()

    def mark_action_completed(
        self,
        action_id: int,
        notes: str = None
    ) -> Optional[SyncAction]:
        """
        Marca uma ação como completada e executa automações associadas.

        Args:
            action_id: ID da ação
            notes: Notas do usuário (opcional)

        Returns:
            SyncAction atualizada ou None
        """
        action = self.get_action_by_id(action_id)

        if not action:
            logger.warning(f"Action {action_id} not found")
            return None

        # Executar efeitos colaterais antes de marcar como completo
        # Se falhar, podemos decidir se marcamos ou não. Por enquanto, logamos erro.
        try:
            self._execute_action_side_effects(action)
        except Exception as e:
            logger.error(f"Error executing side effects for action {action_id}: {e}")
            notes = f"{notes or ''} [WARNING: Automação falhou: {str(e)}]"

        action.mark_completed(notes)
        self.db.commit()
        self.db.refresh(action)

        logger.info(f"✅ Action {action_id} marked as completed")
        return action

    def _execute_action_side_effects(self, action: SyncAction):
        """Executa automações vinculadas à ação"""
        if action.action_type == ActionType.APPROVE_BOOKING:
            self._handle_approve_booking(action)

    def _handle_approve_booking(self, action: SyncAction):
        """
        Lógica de aprovação:
        1. Gera documento de autorização
        2. Envia email para portaria com documento anexo
        """
        if not action.trigger_booking:
            logger.warning(f"Action {action.id} (Approve) has no trigger booking")
            return

        booking = action.trigger_booking
        logger.info(f"Executing approval logic for booking {booking.id} ({booking.guest_name})")

        # 1. Gerar Documento
        property_obj = booking.property_rel
        
        # Preparar dados para o documento
        guest_data = {
            "name": booking.guest_name,
            "cpf": "", # Booking/Airbnb nem sempre enviam CPF. DocumentService lida com vazio.
            "email": booking.guest_email or "",
            "phone": booking.guest_phone or "",
        }
        
        # Tentar pegar dados mais completos se houver objeto Guest
        if booking.guest:
            guest_data.update({
                "name": booking.guest.name,
                "cpf": booking.guest.document_number,
                "email": booking.guest.email,
                "phone": booking.guest.phone,
            })

        booking_data = {
            "check_in": booking.check_in_date,
            "check_out": booking.check_out_date
        }

        property_data = {
            "name": property_obj.name,
            "address": property_obj.address,
            "condo_name": property_obj.condo_name,
            "owner_name": settings.OWNER_NAME,
        }

        # Gerar PDF/DOCX (em memória para enviar por email, ou salvar em disco e anexar)
        # O DocumentService salva em disco por padrão. Vamos usar isso.
        doc_result = self.document_service.generate_condo_authorization(
            booking_data=booking_data,
            property_data=property_data,
            guest_data=guest_data,
            save_to_file=True
        )

        if not doc_result["success"]:
            raise Exception(f"Failed to generate document: {doc_result['message']}")

        file_path = doc_result["file_path"]
        filename = doc_result["filename"]
        logger.info(f"Document generated: {filename}")

        # 2. Enviar Email para Portaria
        # Verificar se existe email configurado. 
        # Como Property model ainda não tem concierge_email, vamos usar env var ou placeholder.
        # TODO: Adicionar campo concierge_email no model Property
        concierge_email = getattr(settings, "CONCIERGE_EMAIL", None)
        
        if not concierge_email:
            # Fallback: tentar ler de uma variável de ambiente simulada ou avisar
            # Para este MVP, vamos logar aviso se não tiver
             logger.warning("CONCIERGE_EMAIL not set in settings. Skipping email to concierge.")
             return

        if not self.email_service:
             logger.warning("EmailService not available. Skipping email to concierge.")
             return

        # Ler arquivo para anexo
        import asyncio
        # Como estamos num contexto síncrono (método chamado por API sync), 
        # e send_email é async, precisamos rodar no event loop.
        # Mas SyncActionService é síncrono.
        # Solução rápida: ler arquivo em bytes
        with open(file_path, "rb") as f:
            file_content = f.read()

        attachment = {
            "filename": filename,
            "content": file_content
        }

        subject = f"Autorização de Hospedagem - {property_obj.name} - {booking.guest_name}"

        check_in_str = booking.check_in_date.strftime('%d/%m/%Y') if booking.check_in_date else "N/A"
        check_out_str = booking.check_out_date.strftime('%d/%m/%Y') if booking.check_out_date else "N/A"

        body = f"""
        Olá,

        Segue em anexo a autorização de hospedagem para a unidade {property_obj.name}.

        Hóspede: {booking.guest_name}
        Check-in: {check_in_str}
        Check-out: {check_out_str}

        Atenciosamente,
        {settings.OWNER_NAME}
        """

        # Disparar envio (Async to Sync bridge)
        # Usa create_task com callback para capturar erros
        async def _send_and_log():
            try:
                result = await self.email_service.send_email(
                    to=[concierge_email],
                    subject=subject,
                    body=body,
                    attachments=[attachment]
                )
                if result.get("success"):
                    logger.info(f"✅ Email sent to concierge: {concierge_email}")
                else:
                    logger.error(f"❌ Failed to send email to concierge: {result.get('message')}")
            except Exception as e:
                logger.error(f"❌ Exception sending email to concierge: {e}")

        try:
            loop = asyncio.get_running_loop()
            # Dentro de um contexto async (FastAPI) — agendar a task com tratamento de erro
            loop.create_task(_send_and_log())
        except RuntimeError:
            # Fora de um contexto async — rodar sincronamente
            asyncio.run(_send_and_log())

        logger.info(f"Email dispatch initiated to concierge: {concierge_email}")

    def mark_action_dismissed(
        self,
        action_id: int,
        notes: str = None
    ) -> Optional[SyncAction]:
        """
        Marca uma ação como descartada.
        """
        action = self.get_action_by_id(action_id)

        if not action:
            logger.warning(f"Action {action_id} not found")
            return None

        action.mark_dismissed(notes)
        self.db.commit()
        self.db.refresh(action)

        logger.info(f"Action {action_id} dismissed")
        return action

    def auto_dismiss_expired_actions(self, property_id: int) -> int:
        """
        Auto-descarta ações que expiraram.
        """
        pending_actions = self.get_pending_actions(property_id)
        dismissed_count = 0

        for action in pending_actions:
            if action.should_auto_dismiss:
                action.status = ActionStatus.EXPIRED
                action.dismissed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                action.user_notes = "Auto-dismissed: expired"
                dismissed_count += 1

        if dismissed_count > 0:
            self.db.commit()
            logger.info(f"Auto-dismissed {dismissed_count} expired actions")

        return dismissed_count

    def get_action_summary(self, property_id: int) -> Dict[str, int]:
        """
        Retorna resumo de ações.
        """
        total_pending = self.db.query(SyncAction).filter(
            and_(
                SyncAction.property_id == property_id,
                SyncAction.status == ActionStatus.PENDING
            )
        ).count()

        critical_pending = self.db.query(SyncAction).filter(
            and_(
                SyncAction.property_id == property_id,
                SyncAction.status == ActionStatus.PENDING,
                SyncAction.priority == "critical"
            )
        ).count()

        total_completed = self.db.query(SyncAction).filter(
            and_(
                SyncAction.property_id == property_id,
                SyncAction.status == ActionStatus.COMPLETED
            )
        ).count()

        return {
            "pending": total_pending,
            "critical": critical_pending,
            "completed": total_completed
        }

    def _generate_block_url(
        self,
        platform: TargetPlatform,
        start_date: date,
        end_date: date
    ) -> Optional[str]:
        """
        Gera URL direta para bloqueio (quando possível).
        """
        if platform == TargetPlatform.AIRBNB:
            # Airbnb não tem URL direta para bloqueio específico
            return "https://www.airbnb.com/hosting/calendar"

        elif platform == TargetPlatform.BOOKING:
            # Booking também não tem URL direta parametrizada publicamente
            return "https://admin.booking.com/hotel/hoteladmin/availability.html"

        return None

    def _generate_cancel_url(self, booking: Booking) -> Optional[str]:
        """
        Gera URL direta para cancelamento (quando possível).
        """
        if booking.platform == "airbnb":
            # Airbnb não expõe URLs diretas de reserva via iCal
            return "https://www.airbnb.com/hosting/reservations"

        elif booking.platform == "booking":
            # Booking também não
            return "https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html"

        return None
