"""
Serviço para gerenciamento de configurações persistentes.
Faz merge entre configurações do .env e do banco de dados.
"""
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.config import settings as app_settings
from app.models.app_settings import AppSetting
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Campos que podem ser editados via frontend
# Mapa: chave_frontend -> chave_db
EDITABLE_FIELDS = {
    "condoEmail": "condo_email",
    "maxGuests": "max_guests",
    "syncIntervalMinutes": "sync_interval_minutes",
    "enableAutoDocumentGeneration": "enable_auto_document_generation",
    "enableConflictNotifications": "enable_conflict_notifications",
    # Imóvel (override do .env via Modo de Edição)
    "propertyName": "property_name",
    "propertyAddress": "property_address",
    # Condomínio (override do .env via Modo de Edição)
    "condoName": "condo_name",
    "condoAdminName": "condo_admin_name",
    # Proprietário (override do .env via Modo de Edição)
    "ownerName": "owner_name",
    "ownerEmail": "owner_email",
    "ownerPhone": "owner_phone",
    "ownerApto": "owner_apto",
    "ownerBloco": "owner_bloco",
    "ownerGaragem": "owner_garagem",
    # AI Settings
    "aiProvider": "ai_provider",
    "aiApiKey": "ai_api_key",
    "aiModel": "ai_model",
    "aiBaseUrl": "ai_base_url",
    # Document / branding
    "condoLogoUrl": "condo_logo_url",
}

# Mapa: chave_db -> tipo Python
FIELD_TYPES = {
    "condo_email": str,
    "max_guests": int,
    "sync_interval_minutes": int,
    "enable_auto_document_generation": bool,
    "enable_conflict_notifications": bool,
    # Imóvel / condomínio / proprietário
    "property_name": str,
    "property_address": str,
    "condo_name": str,
    "condo_admin_name": str,
    "owner_name": str,
    "owner_email": str,
    "owner_phone": str,
    "owner_apto": str,
    "owner_bloco": str,
    "owner_garagem": str,
    # AI
    "ai_provider": str,
    "ai_api_key": str,
    "ai_model": str,
    "ai_base_url": str,
    "condo_logo_url": str,
}


class SettingsService:
    """Serviço para configurações persistentes (merge .env + DB)"""

    def __init__(self, db: Session):
        self.db = db

    def get_all_settings(self) -> Dict[str, Any]:
        """
        Retorna todas as configurações.
        Merge: .env fornece base, DB sobrescreve campos editáveis.
        """
        # Base do .env (read-only)
        result = {
            "propertyName": app_settings.PROPERTY_NAME,
            "propertyAddress": app_settings.PROPERTY_ADDRESS,
            "condoName": app_settings.CONDO_NAME,
            "condoAdminName": app_settings.CONDO_ADMIN_NAME,
            "ownerName": app_settings.OWNER_NAME,
            "ownerEmail": app_settings.OWNER_EMAIL,
            "ownerPhone": app_settings.OWNER_PHONE,
            "ownerApto": app_settings.OWNER_APTO,
            "ownerBloco": app_settings.OWNER_BLOCO,
            "ownerGaragem": app_settings.OWNER_GARAGEM,
            "contactPhone": app_settings.CONTACT_PHONE,
            "contactEmail": app_settings.CONTACT_EMAIL,
            "timezone": app_settings.TIMEZONE,
            # iCal URLs (read-only, exibição apenas)
            "airbnbIcalUrl": getattr(app_settings, "AIRBNB_ICAL_URL", "") or "",
            "bookingIcalUrl": getattr(app_settings, "BOOKING_ICAL_URL", "") or "",
            # Email (read-only, exibição apenas; senha nunca retornada)
            "emailProvider": getattr(app_settings, "EMAIL_PROVIDER", "") or "",
            "emailFrom": getattr(app_settings, "EMAIL_FROM", "") or "",
            "emailPasswordSet": bool(getattr(app_settings, "EMAIL_PASSWORD", "")),
            # Telegram (read-only, exibição apenas)
            "telegramBotToken": self._mask_token(getattr(app_settings, "TELEGRAM_BOT_TOKEN", "") or ""),

            # Campos editáveis (defaults do .env, substituídos pelo DB)
            "condoEmail": app_settings.CONDO_EMAIL,
            "maxGuests": 6,
            "syncIntervalMinutes": app_settings.CALENDAR_SYNC_INTERVAL_MINUTES,
            "enableAutoDocumentGeneration": app_settings.ENABLE_AUTO_DOCUMENT_GENERATION,
            "enableConflictNotifications": app_settings.ENABLE_CONFLICT_NOTIFICATIONS,
            # AI Settings (defaults do .env, substituídos pelo DB)
            "aiProvider": app_settings.AI_PROVIDER,
            "aiApiKey": "",  # nunca retornar a chave completa
            "aiApiKeySet": bool(app_settings.effective_ai_key),
            "aiModel": app_settings.effective_ai_model,
            "aiBaseUrl": app_settings.AI_BASE_URL or "",
            # Document / branding (DB only, default empty)
            "condoLogoUrl": "",
        }

        # Sobrescrever com valores do DB
        db_settings = self._get_all_from_db()
        for frontend_key, db_key in EDITABLE_FIELDS.items():
            if db_key in db_settings:
                field_type = FIELD_TYPES.get(db_key, str)
                result[frontend_key] = self._cast_value(db_settings[db_key], field_type)

        return result

    def update_settings(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Salva campos editáveis no banco de dados.
        Apenas campos na allowlist são aceitos.
        """
        saved = {}
        for frontend_key, value in data.items():
            if frontend_key in EDITABLE_FIELDS and value is not None:
                db_key = EDITABLE_FIELDS[frontend_key]
                self._upsert(db_key, str(value))
                saved[frontend_key] = value
                logger.info(f"Setting updated: {db_key} = {value}")

        self.db.commit()
        return saved

    def reset_all_settings(self) -> int:
        """
        Deleta todos os AppSetting do banco de dados, revertendo para os valores originais do .env.

        Returns:
            Número de registros deletados
        """
        count = self.db.query(AppSetting).count()
        self.db.query(AppSetting).delete()
        self.db.commit()
        logger.info(f"[SettingsService] Hard reset: {count} configurações removidas do DB.")
        return count

    def get_setting(self, db_key: str) -> Optional[str]:
        """Busca uma configuração específica do DB"""
        setting = self.db.query(AppSetting).filter(
            AppSetting.key == db_key
        ).first()
        return setting.value if setting else None

    def _get_all_from_db(self) -> Dict[str, str]:
        """Busca todas as configurações do DB"""
        settings = self.db.query(AppSetting).all()
        return {s.key: s.value for s in settings}

    def _upsert(self, key: str, value: str):
        """Insere ou atualiza uma configuração"""
        setting = self.db.query(AppSetting).filter(
            AppSetting.key == key
        ).first()

        if setting:
            setting.value = value
        else:
            setting = AppSetting(key=key, value=value)
            self.db.add(setting)

    @staticmethod
    def _mask_token(token: str) -> str:
        """Mascara token Telegram mostrando apenas os primeiros 8 chars"""
        if not token or len(token) < 8:
            return token
        return token[:8] + "•" * min(len(token) - 8, 20)

    @staticmethod
    def _cast_value(value: str, field_type: type) -> Any:
        """Converte valor string do DB para o tipo correto"""
        try:
            if field_type == bool:
                return value.lower() in ("true", "1", "yes")
            elif field_type == int:
                return int(value)
            elif field_type == float:
                return float(value)
            return value
        except (ValueError, AttributeError):
            return value
