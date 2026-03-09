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
    maxGuests: int = 6
    condoName: str = ""
    condoAdminName: str = ""

    # Dados do proprietário (read-only, do .env)
    ownerName: str = ""
    ownerEmail: str = ""
    ownerPhone: str = ""
    ownerApto: str = ""
    ownerBloco: str = ""
    ownerGaragem: str = ""

    # Editáveis (merge .env + DB)
    condoEmail: str = ""
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
