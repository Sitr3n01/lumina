# app/services/email_service.py
"""
Serviço universal de email com suporte IMAP/SMTP.
Compatível com Gmail, Outlook, Yahoo e outros provedores.
"""
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from pathlib import Path
from typing import List, Dict, Any, Optional
import aiosmtplib
import aioimaplib
from jinja2 import FileSystemLoader, Template
from jinja2.sandbox import SandboxedEnvironment

from app.config import settings
from app.utils.logger import get_logger
from app.database.session import SessionLocal

logger = get_logger(__name__)


class EmailConfig:
    """Configuração de servidor de email"""

    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        imap_host: str,
        imap_port: int,
        username: str,
        password: str,
        use_tls: bool = True
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.imap_host = imap_host
        self.imap_port = imap_port
        self.username = username
        self.password = password
        self.use_tls = use_tls


class EmailService:
    """
    Serviço universal de email com IMAP/SMTP.
    """

    # Configurações pré-definidas para provedores populares
    PROVIDERS = {
        "gmail": {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "imap_host": "imap.gmail.com",
            "imap_port": 993,
            "use_tls": True
        },
        "outlook": {
            "smtp_host": "smtp-mail.outlook.com",
            "smtp_port": 587,
            "imap_host": "outlook.office365.com",
            "imap_port": 993,
            "use_tls": True
        },
        "yahoo": {
            "smtp_host": "smtp.mail.yahoo.com",
            "smtp_port": 587,
            "imap_host": "imap.mail.yahoo.com",
            "imap_port": 993,
            "use_tls": True
        }
    }

    def __init__(self, config: EmailConfig):
        """
        Inicializa o serviço de email.
        """
        self.config = config
        self.template_env = self._setup_template_engine()

    @classmethod
    def from_provider(
        cls,
        provider: str,
        username: str,
        password: str,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> "EmailService":
        """
        Cria instância a partir de provedor pré-configurado.
        """
        if provider.lower() == "custom" and custom_config:
            config = EmailConfig(
                smtp_host=custom_config.get("smtp_host"),
                smtp_port=int(custom_config.get("smtp_port", 587)),
                imap_host=custom_config.get("imap_host"),
                imap_port=int(custom_config.get("imap_port", 993)),
                username=username,
                password=password,
                use_tls=True
            )
            return cls(config)

        if provider.lower() not in cls.PROVIDERS:
            # Fallback to gmail default if unknown, or raise error
            # For robustness, let's try to map generic names
            provider = "gmail" 
        
        provider_config = cls.PROVIDERS[provider.lower()]
        config = EmailConfig(
            smtp_host=provider_config["smtp_host"],
            smtp_port=provider_config["smtp_port"],
            imap_host=provider_config["imap_host"],
            imap_port=provider_config["imap_port"],
            username=username,
            password=password,
            use_tls=provider_config["use_tls"]
        )

        return cls(config)

    def _setup_template_engine(self) -> SandboxedEnvironment:
        """Configura Jinja2 Sandboxed para templates de email.
        SandboxedEnvironment previne acesso a atributos Python internos,
        chamadas de funções perigosas e escalação de privilégios via templates.
        """
        template_dir = Path(settings.TEMPLATE_DIR) / "email"
        template_dir.mkdir(parents=True, exist_ok=True)

        return SandboxedEnvironment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=True
        )

    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Envia email via SMTP."""
        try:
            # Criar mensagem
            import uuid
            msg = MIMEMultipart()
            msg["From"] = self.config.username
            msg["To"] = ", ".join(to)
            msg["Subject"] = subject
            msg["Message-ID"] = f"<{uuid.uuid4()}@lumina.local>"

            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)

            # Adicionar corpo
            mime_type = "html" if html else "plain"
            msg.attach(MIMEText(body, mime_type, "utf-8"))

            # Adicionar anexos
            if attachments:
                from app.core.validators import sanitize_filename
                for attachment in attachments:
                    safe_filename = sanitize_filename(attachment["filename"])
                    part = MIMEApplication(attachment["content"])
                    part.add_header(
                        "Content-Disposition",
                        "attachment",
                        filename=safe_filename
                    )
                    msg.attach(part)

            # Enviar email (com timeout de 30s)
            async with aiosmtplib.SMTP(
                hostname=self.config.smtp_host,
                port=self.config.smtp_port,
                use_tls=self.config.use_tls,
                timeout=30
            ) as smtp:
                await smtp.login(self.config.username, self.config.password)

                all_recipients = to.copy()
                if cc:
                    all_recipients.extend(cc)
                if bcc:
                    all_recipients.extend(bcc)

                await smtp.send_message(msg, recipients=all_recipients)

            logger.info(f"Email sent successfully to {', '.join(to)}")

            return {
                "success": True,
                "message": "Email enviado com sucesso",
                "message_id": msg.get("Message-ID", "")
            }

        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return {
                "success": False,
                "message": "Erro ao enviar email. Verifique as configurações e tente novamente."
            }

    async def send_template_email(
        self,
        to: List[str],
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """Envia email usando template Jinja2."""
        try:
            import os
            safe_template_name = os.path.basename(template_name)

            if safe_template_name != template_name or '..' in template_name:
                return {"success": False, "message": "Nome de template inválido"}

            ALLOWED_TEMPLATES = {
                'booking_confirmation.html',
                'checkin_reminder.html',
                'checkout_reminder.html',
                'payment_receipt.html',
                'welcome_email.html'
            }

            if safe_template_name not in ALLOWED_TEMPLATES:
                return {"success": False, "message": "Template não permitido"}

            # Sanitizar contexto (simplificado)
            sanitized_context = context

            template = self.template_env.get_template(safe_template_name)
            html_body = template.render(**sanitized_context)

            return await self.send_email(
                to=to,
                subject=subject,
                body=html_body,
                html=True,
                **kwargs
            )

        except Exception as e:
            logger.error(f"Error sending template email: {e}")
            return {"success": False, "message": "Erro ao renderizar ou enviar template de email."}

    async def fetch_emails(
        self,
        folder: str = "INBOX",
        limit: int = 10,
        unread_only: bool = False,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Busca emails via IMAP com timeout de segurança."""
        imap = None
        try:
            imap = aioimaplib.IMAP4_SSL(
                host=self.config.imap_host,
                port=self.config.imap_port,
                timeout=timeout
            )

            await asyncio.wait_for(
                imap.wait_hello_from_server(), timeout=timeout
            )
            await asyncio.wait_for(
                imap.login(self.config.username, self.config.password),
                timeout=timeout
            )
            await asyncio.wait_for(imap.select(folder), timeout=timeout)

            search_criteria = "UNSEEN" if unread_only else "ALL"
            _, data = await asyncio.wait_for(
                imap.search(search_criteria), timeout=timeout
            )

            if not data or not data[0]:
                logger.info(f"No emails found in folder {folder}")
                return {"success": True, "emails": [], "count": 0}

            email_ids = data[0].split()
            if not email_ids:
                return {"success": True, "emails": [], "count": 0}

            email_ids = email_ids[-limit:]
            emails = []
            for email_id in email_ids:
                _, msg_data = await asyncio.wait_for(
                    imap.fetch(email_id, "(RFC822)"), timeout=timeout
                )
                emails.append({
                    "id": email_id.decode(),
                    "raw": msg_data[0][1].decode(errors="ignore")
                })

            return {
                "success": True,
                "emails": emails,
                "count": len(emails),
                "message": f"{len(emails)} emails encontrados"
            }

        except asyncio.TimeoutError:
            logger.error(f"IMAP operation timed out after {timeout}s")
            return {"success": False, "message": f"Timeout ao conectar ao servidor IMAP ({timeout}s)", "emails": []}

        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return {"success": False, "message": "Erro ao buscar emails. Verifique as configurações IMAP.", "emails": []}

        finally:
            if imap:
                try:
                    await asyncio.wait_for(imap.logout(), timeout=5)
                except Exception:
                    logger.warning("Failed to properly close IMAP connection")


# Helper para criar instância global
def get_email_service(
    provider: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None
) -> Optional[EmailService]:
    """
    Cria EmailService buscando configurações do Banco de Dados primeiro.
    Fallback para .env ou argumentos.
    """
    
    # 1. Tentar buscar do banco de dados
    db = None
    try:
        from app.services.settings_service import SettingsService
        db = SessionLocal()
        settings_service = SettingsService(db)

        db_username = settings_service.get_setting("email_username")
        db_password = settings_service.get_setting("email_password")
        db_provider = settings_service.get_setting("email_provider")

        # Config customizada
        custom_config = None
        if db_provider == "custom":
            custom_config = {
                "smtp_host": settings_service.get_setting("email_smtp_host"),
                "smtp_port": settings_service.get_setting("email_smtp_port"),
                "imap_host": settings_service.get_setting("email_imap_host"),
                "imap_port": settings_service.get_setting("email_imap_port"),
            }

        if db_username and db_password:
            # Usar configs do banco
            provider = db_provider or "gmail"
            username = db_username
            password = db_password

            return EmailService.from_provider(provider, username, password, custom_config)

    except Exception as e:
        logger.warning(f"Failed to load email settings from DB: {e}")
    finally:
        if db:
            db.close()

    # 2. Fallback: .env (via settings module)
    # Se argumentos não foram passados, usar do settings
    if not username:
        username = getattr(settings, "EMAIL_USERNAME", None)
    if not password:
        password = getattr(settings, "EMAIL_PASSWORD", None)
    if not provider:
        provider = getattr(settings, "EMAIL_PROVIDER", "gmail")

    if not username or not password:
        logger.warning("Email credentials not provided in DB or .env")
        return None

    try:
        return EmailService.from_provider(provider, username, password)
    except Exception as e:
        logger.error(f"Error creating email service: {e}")
        return None
