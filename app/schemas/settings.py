"""
Schemas Pydantic para configurações do sistema.
"""
from typing import Optional
from pydantic import BaseModel, Field


class SettingsUpdate(BaseModel):
    """Campos editáveis pelo frontend"""
    condoEmail: Optional[str] = Field(None, description="Email do condomínio")
    syncIntervalMinutes: Optional[int] = Field(None, ge=5, le=1440, description="Intervalo de sync em minutos")
    enableAutoDocumentGeneration: Optional[bool] = Field(None, description="Geração automática de documentos")
    enableConflictNotifications: Optional[bool] = Field(None, description="Notificações de conflitos")
    # Imóvel (editáveis via Modo de Edição — override do .env)
    maxGuests: Optional[int] = Field(None, ge=1, le=20, description="Capacidade máxima de hóspedes")
    propertyName: Optional[str] = Field(None, description="Nome do imóvel (override do wizard)")
    propertyAddress: Optional[str] = Field(None, description="Endereço do imóvel (override do wizard)")
    # Condomínio (editáveis via Modo de Edição)
    condoName: Optional[str] = Field(None, description="Nome do condomínio (override do wizard)")
    condoAdminName: Optional[str] = Field(None, description="Nome da administração (override do wizard)")
    # Proprietário (editáveis via Modo de Edição)
    ownerName: Optional[str] = Field(None, description="Nome do proprietário (override do wizard)")
    ownerEmail: Optional[str] = Field(None, description="Email do proprietário (override do wizard)")
    ownerPhone: Optional[str] = Field(None, description="Telefone do proprietário (override do wizard)")
    ownerApto: Optional[str] = Field(None, description="Apartamento do proprietário (override do wizard)")
    ownerBloco: Optional[str] = Field(None, description="Bloco do proprietário (override do wizard)")
    ownerGaragem: Optional[str] = Field(None, description="Garagem do proprietário (override do wizard)")
    # AI Settings
    aiProvider: Optional[str] = Field(None, description="Provider de IA: anthropic | openai | compatible")
    aiApiKey: Optional[str] = Field(None, description="API Key do provider de IA")
    aiModel: Optional[str] = Field(None, description="Nome do modelo de IA")
    aiBaseUrl: Optional[str] = Field(None, description="Base URL para providers compatíveis")
    # Document / branding
    condoLogoUrl: Optional[str] = Field(None, description="URL ou base64 do logo do condomínio (para template de documentos)")


class SettingsResponse(BaseModel):
    """Resposta completa de settings (merge .env + DB)"""
    # Dados do imóvel (read-only, do .env)
    propertyName: str = ""
    propertyAddress: str = ""
    condoName: str = ""
    condoAdminName: str = ""

    # Dados do proprietário (read-only, do .env)
    ownerName: str = ""
    ownerEmail: str = ""
    ownerPhone: str = ""
    ownerApto: str = ""
    ownerBloco: str = ""
    ownerGaragem: str = ""

    # URLs iCal (read-only, do .env — exibição apenas)
    airbnbIcalUrl: str = ""
    bookingIcalUrl: str = ""

    # Email (read-only, do .env — exibição apenas; senha nunca retornada)
    emailProvider: str = ""
    emailFrom: str = ""
    emailPasswordSet: bool = False

    # Telegram (read-only, do .env — exibição apenas)
    telegramBotToken: str = ""

    # Editáveis (merge .env + DB)
    condoEmail: str = ""
    maxGuests: int = 6
    syncIntervalMinutes: int = 30
    enableAutoDocumentGeneration: bool = False
    enableConflictNotifications: bool = True

    # Informações extras (read-only)
    contactPhone: str = ""
    contactEmail: str = ""
    timezone: str = "America/Sao_Paulo"

    # AI Settings (editáveis via /settings ou /ai/settings)
    aiProvider: str = "anthropic"
    aiApiKey: str = ""
    aiApiKeySet: bool = False
    aiModel: str = ""
    aiBaseUrl: str = ""

    # Document / branding
    condoLogoUrl: str = ""

    class Config:
        from_attributes = True
