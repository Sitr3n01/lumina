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
    "syncIntervalMinutes": "sync_interval_minutes",
    "enableAutoDocumentGeneration": "enable_auto_document_generation",
    "enableConflictNotifications": "enable_conflict_notifications",
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
    "sync_interval_minutes": int,
    "enable_auto_document_generation": bool,
    "enable_conflict_notifications": bool,
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
            "maxGuests": 6,
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

            # Campos editáveis (defaults do .env)
            "condoEmail": app_settings.CONDO_EMAIL,
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
