# app/schemas/email.py
"""
Schemas Pydantic para envio e gerenciamento de emails.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_no_crlf(v: str, field_name: str) -> str:
    """Prevenir SMTP header injection via CRLF em headers"""
    if '\r' in v or '\n' in v:
        raise ValueError(f'{field_name} não pode conter caracteres de newline (\\r ou \\n)')
    return v


class SendEmailRequest(BaseModel):
    """Request para envio de email personalizado"""
    to: List[EmailStr] = Field(..., description="Lista de destinatários", max_length=50)
    subject: str = Field(..., min_length=1, max_length=500, description="Assunto do email")
    body: str = Field(..., min_length=1, max_length=100000, description="Corpo do email (texto ou HTML)")
    html: bool = Field(default=False, description="Se True, corpo é HTML")
    cc: Optional[List[EmailStr]] = Field(None, description="Lista de destinatários em cópia", max_length=20)
    bcc: Optional[List[EmailStr]] = Field(None, description="Lista de destinatários em cópia oculta", max_length=20)
    attachments: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Lista de anexos (cada item: {filename, content, content_type})",
        max_length=10
    )

    @field_validator('subject')
    @classmethod
    def validate_subject_no_injection(cls, v: str) -> str:
        """Prevenir SMTP header injection no subject"""
        return _validate_no_crlf(v, 'Subject')


class SendTemplateEmailRequest(BaseModel):
    """Request para envio de email usando template"""
    to: List[EmailStr] = Field(..., description="Lista de destinatários", max_length=50)
    subject: str = Field(..., min_length=1, max_length=500, description="Assunto do email")
    template_name: str = Field(..., description="Nome do template (ex: booking_confirmation.html)")
    context: Dict[str, Any] = Field(..., description="Variáveis do template")
    cc: Optional[List[EmailStr]] = Field(None, max_length=20)
    bcc: Optional[List[EmailStr]] = Field(None, max_length=20)
    attachments: Optional[List[Dict[str, Any]]] = Field(None, max_length=10)

    @field_validator('subject')
    @classmethod
    def validate_subject_no_injection(cls, v: str) -> str:
        """Prevenir SMTP header injection no subject"""
        return _validate_no_crlf(v, 'Subject')

    @field_validator('context')
    @classmethod
    def validate_context_no_injection(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Prevenir injection via valores do contexto do template"""
        for key, value in v.items():
            if isinstance(value, str):
                # Bloquear CRLF injection em valores de contexto
                if '\r' in value or '\n' in value:
                    raise ValueError(f'Contexto [{key}] não pode conter caracteres CRLF')
                # Bloquear tentativas de template injection (Jinja2)
                if '{{' in value or '{%' in value or '{#' in value:
                    raise ValueError(f'Contexto [{key}] contém padrões de template não permitidos')
        return v


class SendBookingConfirmationRequest(BaseModel):
    """Request simplificado para enviar confirmação de reserva"""
    booking_id: int = Field(..., description="ID da reserva")
    send_in_background: bool = Field(
        default=True,
        description="Se True, envia em background"
    )


class SendCheckinReminderRequest(BaseModel):
    """Request simplificado para enviar lembrete de check-in"""
    booking_id: int = Field(..., description="ID da reserva")
    send_in_background: bool = Field(
        default=True,
        description="Se True, envia em background"
    )


class FetchEmailsRequest(BaseModel):
    """Request para buscar emails via IMAP"""
    folder: str = Field(default="INBOX", description="Pasta do email (INBOX, SENT, etc)")
    limit: int = Field(default=10, ge=1, le=100, description="Número máximo de emails")
    unread_only: bool = Field(default=False, description="Apenas emails não lidos")

    @field_validator('folder')
    @classmethod
    def validate_folder_name(cls, v: str) -> str:
        """SECURITY: Prevenir IMAP injection via nome de pasta malicioso"""
        import re
        if not re.match(r'^[A-Za-z0-9_./ -]{1,64}$', v):
            raise ValueError('Nome de pasta IMAP inválido')
        return v


class EmailResponse(BaseModel):
    """Response genérico para operações de email"""
    success: bool
    message: str
    message_id: Optional[str] = None


class EmailItem(BaseModel):
    """Item de email retornado pela busca IMAP"""
    uid: str = Field(..., description="UID único do email")
    from_addr: str = Field(..., description="Remetente")
    to_addr: List[str] = Field(..., description="Destinatários")
    subject: str = Field(..., description="Assunto")
    date: str = Field(..., description="Data do email")
    body: str = Field(..., description="Corpo do email")
    is_read: bool = Field(..., description="Se foi lido")

    class Config:
        from_attributes = True


class EmailListResponse(BaseModel):
    """Response para listagem de emails"""
    success: bool
    total: int
    emails: List[EmailItem]
