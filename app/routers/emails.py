# app/routers/emails.py
"""
Router para envio e gerenciamento de emails.
Suporta envio de templates, emails personalizados e busca via IMAP.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database.session import get_db
from app.models.user import User
from app.models.booking import Booking
from app.models.property import Property
from app.models.guest import Guest
from app.middleware.auth import get_current_active_user, get_current_admin_user
from app.services.email_service import EmailService
from app.schemas.email import (
    SendEmailRequest,
    SendTemplateEmailRequest,
    SendBookingConfirmationRequest,
    SendCheckinReminderRequest,
    FetchEmailsRequest,
    EmailResponse,
    EmailListResponse,
    EmailItem
)
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/emails", tags=["Emails"])
limiter = Limiter(key_func=get_remote_address)


def get_email_service() -> EmailService:
    """Dependency para obter instância do EmailService"""
    # Verificar se email está configurado
    if not settings.EMAIL_FROM or not settings.EMAIL_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not configured. Please set EMAIL_FROM and EMAIL_PASSWORD in .env"
        )

    # Usar provider pré-configurado (gmail, outlook, yahoo)
    if settings.EMAIL_PROVIDER.lower() in ["gmail", "outlook", "yahoo"]:
        return EmailService.from_provider(
            provider=settings.EMAIL_PROVIDER.lower(),
            username=settings.EMAIL_FROM,
            password=settings.EMAIL_PASSWORD
        )

    # Usar configuração customizada
    from app.services.email_service import EmailConfig
    config = EmailConfig(
        smtp_host=settings.EMAIL_SMTP_HOST or "smtp.gmail.com",
        smtp_port=settings.EMAIL_SMTP_PORT,
        imap_host=settings.EMAIL_IMAP_HOST or "imap.gmail.com",
        imap_port=settings.EMAIL_IMAP_PORT,
        username=settings.EMAIL_FROM,
        password=settings.EMAIL_PASSWORD,
        use_tls=settings.EMAIL_USE_TLS
    )
    return EmailService(config)


@router.post("/send", response_model=EmailResponse)
@limiter.limit("10/minute")  # Rate limit: máximo 10 emails por minuto
async def send_email(
    request: Request,
    email_request: SendEmailRequest,
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envia email personalizado (texto ou HTML).

    Permite enviar emails com corpo customizado, CC, BCC e anexos.

    Returns:
        EmailResponse com sucesso e message_id
    """
    try:
        result = await email_service.send_email(
            to=email_request.to,
            subject=email_request.subject,
            body=email_request.body,
            html=email_request.html,
            cc=email_request.cc,
            bcc=email_request.bcc,
            attachments=email_request.attachments
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

        return EmailResponse(
            success=True,
            message="Email enviado com sucesso",
            message_id=result.get("message_id")
        )

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao enviar email. Verifique as configurações."
        )


@router.post("/send-template", response_model=EmailResponse)
@limiter.limit("10/minute")  # Rate limit: máximo 10 emails por minuto
async def send_template_email(
    request: Request,
    email_request: SendTemplateEmailRequest,
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envia email usando template Jinja2.

    Renderiza template com contexto fornecido e envia email.

    Returns:
        EmailResponse com sucesso e message_id
    """
    try:
        result = await email_service.send_template_email(
            to=email_request.to,
            subject=email_request.subject,
            template_name=email_request.template_name,
            context=email_request.context,
            cc=email_request.cc,
            bcc=email_request.bcc,
            attachments=email_request.attachments
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

        return EmailResponse(
            success=True,
            message="Email enviado com sucesso",
            message_id=result.get("message_id")
        )

    except Exception as e:
        logger.error(f"Error sending template email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao enviar email. Verifique as configurações."
        )


@router.post("/send-booking-confirmation", response_model=EmailResponse)
@limiter.limit("20/minute")  # Rate limit: confirmações podem ser mais frequentes
async def send_booking_confirmation(
    request: Request,
    booking_request: SendBookingConfirmationRequest,
    background_tasks: BackgroundTasks,
    send_in_background: bool = Query(False, description="Enviar em background"),
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envia email de confirmação de reserva automaticamente.

    Busca dados da reserva e envia template de confirmação.
    Pode ser executado em background.

    Returns:
        EmailResponse com sucesso
    """
    # Buscar reserva
    booking = db.query(Booking).filter(Booking.id == booking_request.booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reserva {booking_request.booking_id} não encontrada"
        )

    # Buscar imóvel
    property_obj = db.query(Property).filter(Property.id == booking.property_id).first()

    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imóvel não encontrado"
        )

    # Buscar hóspede
    guest_email = None
    guest_name = booking.guest_name or "Hóspede"

    if booking.guest_id:
        guest = db.query(Guest).filter(Guest.id == booking.guest_id).first()
        if guest and guest.email:
            guest_email = guest.email
            guest_name = guest.name

    # Se não tem email do hóspede, não pode enviar
    if not guest_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hóspede não possui email cadastrado"
        )

    # Preparar contexto do template
    context = {
        "guest_name": guest_name,
        "check_in": booking.check_in_date.strftime("%d/%m/%Y"),
        "check_out": booking.check_out_date.strftime("%d/%m/%Y"),
        "property_name": property_obj.name,
        "property_address": property_obj.address,
        "booking_id": booking.id,
        "total_nights": (booking.check_out_date - booking.check_in_date).days
    }

    # Função para enviar email
    async def send_confirmation():
        try:
            result = await email_service.send_template_email(
                to=[guest_email],
                subject=f"Confirmação de Reserva - {property_obj.name}",
                template_name="booking_confirmation.html",
                context=context
            )

            if result["success"]:
                logger.info(f"Booking confirmation sent for booking {booking.id}")
            else:
                logger.error(f"Failed to send confirmation: {result['message']}")

        except Exception as e:
            logger.error(f"Error sending confirmation email: {e}")

    # Enviar em background se solicitado
    if send_in_background:
        background_tasks.add_task(send_confirmation)
        return EmailResponse(
            success=True,
            message="Email de confirmação será enviado em background"
        )
    else:
        await send_confirmation()
        return EmailResponse(
            success=True,
            message="Email de confirmação enviado com sucesso"
        )


@router.post("/send-checkin-reminder", response_model=EmailResponse)
@limiter.limit("20/minute")  # Rate limit: lembretes podem ser mais frequentes
async def send_checkin_reminder(
    request: Request,
    reminder_request: SendCheckinReminderRequest,
    background_tasks: BackgroundTasks,
    send_in_background: bool = Query(False, description="Enviar em background"),
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Envia email de lembrete de check-in.

    Geralmente enviado 1-2 dias antes do check-in.
    Pode ser executado em background.

    Returns:
        EmailResponse com sucesso
    """
    # Buscar reserva
    booking = db.query(Booking).filter(Booking.id == reminder_request.booking_id).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reserva {reminder_request.booking_id} não encontrada"
        )

    # Buscar imóvel
    property_obj = db.query(Property).filter(Property.id == booking.property_id).first()

    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imóvel não encontrado"
        )

    # Buscar hóspede
    guest_email = None
    guest_name = booking.guest_name or "Hóspede"

    if booking.guest_id:
        guest = db.query(Guest).filter(Guest.id == booking.guest_id).first()
        if guest and guest.email:
            guest_email = guest.email
            guest_name = guest.name

    if not guest_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hóspede não possui email cadastrado"
        )

    # Preparar contexto
    # FIX: Garantir que access_instructions nunca é None
    access_instructions = getattr(property_obj, 'access_instructions', None)
    if not access_instructions:
        access_instructions = "Instruções de acesso serão fornecidas em breve."

    context = {
        "guest_name": guest_name,
        "check_in": booking.check_in_date.strftime("%d/%m/%Y"),
        "property_address": property_obj.address,
        "access_instructions": access_instructions,
        "contact_phone": settings.CONTACT_PHONE,
        "contact_email": settings.CONTACT_EMAIL
    }

    # Função para enviar email
    async def send_reminder():
        try:
            result = await email_service.send_template_email(
                to=[guest_email],
                subject=f"⏰ Lembrete: Check-in Amanhã - {property_obj.name}",
                template_name="checkin_reminder.html",
                context=context
            )

            if result["success"]:
                logger.info(f"Check-in reminder sent for booking {booking.id}")
            else:
                logger.error(f"Failed to send reminder: {result['message']}")

        except Exception as e:
            logger.error(f"Error sending reminder email: {e}")

    # Enviar em background se solicitado
    if send_in_background:
        background_tasks.add_task(send_reminder)
        return EmailResponse(
            success=True,
            message="Email de lembrete será enviado em background"
        )
    else:
        await send_reminder()
        return EmailResponse(
            success=True,
            message="Email de lembrete enviado com sucesso"
        )


@router.post("/send-bulk-reminders", response_model=EmailResponse)
@limiter.limit("5/hour")  # Rate limit RESTRITO: bulk emails apenas 5 por hora
async def send_bulk_checkin_reminders(
    request: Request,
    days_before: int = 1,
    batch_size: int = Query(100, ge=1, le=500, description="Tamanho do batch (max 500)"),
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Envia lembretes de check-in em massa para reservas futuras.
    Requer autenticação de administrador.

    Busca todas as reservas com check-in em X dias e envia lembretes.
    Útil para automação via cron/scheduler.

    Args:
        days_before: Quantos dias antes do check-in enviar (padrão 1)

    Returns:
        EmailResponse com quantidade de emails enviados
    """
    # Calcular data alvo
    target_date = datetime.now().date() + timedelta(days=days_before)

    # FIX: Buscar reservas com paginação para evitar DoS
    from app.models.booking import BookingStatus
    from sqlalchemy.orm import joinedload

    bookings = db.query(Booking).options(
        joinedload(Booking.property_rel),
        joinedload(Booking.guest)
    ).filter(
        Booking.check_in_date == target_date,
        Booking.status == BookingStatus.CONFIRMED
    ).limit(batch_size).all()  # FIX: Limitar quantidade

    if not bookings:
        return EmailResponse(
            success=True,
            message=f"Nenhuma reserva encontrada para check-in em {target_date.strftime('%d/%m/%Y')}"
        )

    # FIX: Avisar se batch está limitado
    total_count = db.query(Booking).filter(
        Booking.check_in_date == target_date,
        Booking.status == BookingStatus.CONFIRMED
    ).count()

    if total_count > batch_size:
        logger.warning(f"Bulk reminders limited to {batch_size} bookings (total: {total_count})")

    # Preparar envio concorrente com asyncio.gather
    import asyncio

    async def send_single_reminder(booking):
        """Envia lembrete para uma única reserva. Retorna (booking_id, success)."""
        try:
            property_obj = booking.property_rel
            guest_email = None
            guest_name = booking.guest_name or "Hóspede"

            if booking.guest and booking.guest.email:
                guest_email = booking.guest.email
                guest_name = booking.guest.name

            if not guest_email or not property_obj:
                logger.warning(f"Skipping booking {booking.id}: missing email or property")
                return (booking.id, False)

            access_instructions = getattr(property_obj, 'access_instructions', None)
            if not access_instructions:
                access_instructions = "Instruções de acesso serão fornecidas em breve."

            context = {
                "guest_name": guest_name,
                "check_in": booking.check_in_date.strftime("%d/%m/%Y"),
                "property_address": property_obj.address,
                "access_instructions": access_instructions,
                "contact_phone": settings.CONTACT_PHONE,
                "contact_email": settings.CONTACT_EMAIL
            }

            result = await email_service.send_template_email(
                to=[guest_email],
                subject=f"⏰ Lembrete: Check-in Amanhã - {property_obj.name}",
                template_name="checkin_reminder.html",
                context=context
            )

            if result["success"]:
                logger.info(f"Reminder sent for booking {booking.id}")
                return (booking.id, True)
            return (booking.id, False)

        except Exception as e:
            logger.error(f"Error sending reminder for booking {booking.id}: {e}")
            return (booking.id, False)

    async def send_all_reminders():
        """Envia todos os lembretes concorrentemente (max 5 simultâneos)."""
        semaphore = asyncio.Semaphore(5)

        async def limited_send(bk):
            async with semaphore:
                return await send_single_reminder(bk)

        results = await asyncio.gather(
            *[limited_send(bk) for bk in bookings],
            return_exceptions=True
        )

        sent = sum(1 for r in results if isinstance(r, tuple) and r[1])
        failed = len(results) - sent
        logger.info(f"Bulk reminders complete: {sent} sent, {failed} failed")

    # Executar em background
    background_tasks.add_task(send_all_reminders)

    return EmailResponse(
        success=True,
        message=f"Enviando lembretes para {len(bookings)} reservas em background"
    )


@router.post("/fetch", response_model=EmailListResponse)
async def fetch_emails(
    request: FetchEmailsRequest,
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Busca emails via IMAP.

    Permite listar emails de diferentes pastas (INBOX, SENT, etc).

    Returns:
        EmailListResponse com lista de emails
    """
    try:
        result = await email_service.fetch_emails(
            folder=request.folder,
            limit=request.limit,
            unread_only=request.unread_only
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

        emails = result.get("emails", [])

        return EmailListResponse(
            success=True,
            total=len(emails),
            emails=[EmailItem(**email) for email in emails]
        )

    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar emails. Verifique as configurações."
        )


@router.get("/test-connection")
async def test_email_connection(
    email_service: EmailService = Depends(get_email_service),
    current_user: User = Depends(get_current_active_user)
):
    """
    Testa conexão SMTP e IMAP.

    Útil para validar configurações de email.

    Returns:
        Status da conexão
    """
    results = {
        "smtp": False,
        "imap": False,
        "message": ""
    }

    # Testar SMTP (apenas conexão + login, sem enviar email real)
    try:
        import aiosmtplib
        smtp_client = aiosmtplib.SMTP(
            hostname=email_service.config.smtp_host,
            port=email_service.config.smtp_port,
            use_tls=email_service.config.use_tls,
            timeout=15
        )
        await smtp_client.connect()
        if email_service.config.username and email_service.config.password:
            await smtp_client.login(email_service.config.username, email_service.config.password)
        await smtp_client.quit()
        results["smtp"] = True
    except Exception as e:
        logger.error(f"SMTP test failed: {e}")
        results["message"] += "Erro na conexão SMTP. "

    # Testar IMAP
    try:
        fetch_result = await email_service.fetch_emails(limit=1)
        results["imap"] = fetch_result["success"]
    except Exception as e:
        logger.error(f"IMAP test failed: {e}")
        results["message"] += "Erro na conexão IMAP."

    if results["smtp"] and results["imap"]:
        results["message"] = "Conexão SMTP e IMAP OK"

    return results
