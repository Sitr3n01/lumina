"""
Configuração centralizada da aplicação usando Pydantic Settings.
Carrega variáveis do arquivo .env e valida tipos.
"""
import os
from pathlib import Path
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação Lumina"""

    # === APLICAÇÃO ===
    APP_NAME: str = "Lumina"
    APP_ENV: str = "production"
    LOG_LEVEL: str = "INFO"
    TIMEZONE: str = "America/Sao_Paulo"

    # === MODO DESKTOP ===
    LUMINA_DESKTOP: bool = False

    # === BANCO DE DADOS ===
    DATABASE_URL: str = "sqlite:///./data/sentinel.db"

    # === TELEGRAM BOT (MVP1 - Opcional) ===
    TELEGRAM_BOT_TOKEN: str = Field(default="", description="Token do bot Telegram do BotFather")
    TELEGRAM_ADMIN_USER_IDS: str = Field(default="", description="IDs de usuários admin separados por vírgula")

    # === CALENDÁRIOS ===
    AIRBNB_ICAL_URL: str = Field(default="https://www.airbnb.com/calendar/ical/XXXXXXX.ics", description="URL do feed iCal do Airbnb")
    BOOKING_ICAL_URL: str = Field(default="https://admin.booking.com/hotel/hoteladmin/ical/XXXXXXX.ics", description="URL do feed iCal do Booking")
    CALENDAR_SYNC_INTERVAL_MINUTES: int = 30

    # === EMAIL UNIVERSAL (IMAP/SMTP) - MVP2 ===
    EMAIL_PROVIDER: str = Field(default="gmail", description="Provider: gmail, outlook, yahoo, custom")
    EMAIL_FROM: str = Field(default="", description="Email remetente")
    EMAIL_PASSWORD: str = Field(default="", description="Senha do email ou app password")
    EMAIL_SMTP_HOST: str = Field(default="", description="Host SMTP (customizado)")
    EMAIL_SMTP_PORT: int = Field(default=587, description="Porta SMTP")
    EMAIL_IMAP_HOST: str = Field(default="", description="Host IMAP (customizado)")
    EMAIL_IMAP_PORT: int = Field(default=993, description="Porta IMAP")
    EMAIL_USE_TLS: bool = Field(default=True, description="Usar TLS")
    CONTACT_PHONE: str = Field(default="(62) 99999-9999", description="Telefone de contato")
    CONTACT_EMAIL: str = Field(default="contato@lumina.com", description="Email de contato")

    # === GMAIL API (MVP3) ===
    GMAIL_CREDENTIALS_FILE: str = "./credentials.json"
    GMAIL_TOKEN_FILE: str = "./token.json"
    GMAIL_CHECK_INTERVAL_MINUTES: int = 5
    ENABLE_EMAIL_MONITORING: bool = False

    # === OLLAMA/GEMMA 3 (MVP3) ===
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_TIMEOUT_SECONDS: int = 30
    OLLAMA_TEMPERATURE: float = 0.1

    # === DOCUMENTOS ===
    TEMPLATE_DIR: str = "./templates"
    OUTPUT_DIR: str = "./data/generated_docs"
    DEFAULT_TEMPLATE: str = "autorizacao_condominio.docx"

    # === DADOS DO IMÓVEL (configure no .env) ===
    PROPERTY_NAME: str = "Meu Apartamento"
    PROPERTY_ADDRESS: str = "Condomínio Exemplo"
    CONDO_NAME: str = "Condomínio Exemplo"
    CONDO_ADMIN_NAME: str = "Administração do Condomínio"
    OWNER_NAME: str = "Nome do Proprietário"
    OWNER_EMAIL: str = "proprietario@email.com"
    OWNER_PHONE: str = "(00) 0 0000-0000"
    OWNER_APTO: str = "000"
    OWNER_BLOCO: str = "A"
    OWNER_GARAGEM: str = "000"
    CONDO_EMAIL: str = Field(default="", description="Email do condomínio para envio de autorizações")

    # === FEATURES ===
    ENABLE_AUTO_DOCUMENT_GENERATION: bool = False
    ENABLE_CONFLICT_NOTIFICATIONS: bool = True

    # === SEGURANÇA ===
    SECRET_KEY: str = Field(
        default="",  # FIX: Sem default fraco, força configuração
        description="Chave secreta para JWT - OBRIGATÓRIA em produção"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Valida que SECRET_KEY é adequada para o ambiente"""
        import secrets

        env = info.data.get("APP_ENV", "production")

        # Em produção, SECRET_KEY é OBRIGATÓRIA e deve ser forte
        if env == "production":
            if not v or v == "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION":
                raise ValueError(
                    "\n\n"
                    "=" * 70 + "\n"
                    "ERRO FATAL: SECRET_KEY não configurada para PRODUÇÃO!\n"
                    "=" * 70 + "\n"
                    "A SECRET_KEY é obrigatória e deve ser criptograficamente segura.\n\n"
                    "Como gerar uma SECRET_KEY segura:\n"
                    "  python -c 'import secrets; print(secrets.token_urlsafe(32))'\n\n"
                    "Adicione ao arquivo .env:\n"
                    "  SECRET_KEY=<chave_gerada_acima>\n"
                    "=" * 70 + "\n"
                )

            # Validar comprimento mínimo
            if len(v) < 32:
                raise ValueError(
                    f"SECRET_KEY muito curta ({len(v)} caracteres). "
                    f"Mínimo requerido: 32 caracteres"
                )

        # Em desenvolvimento ou desktop, gerar uma aleatória se não configurada
        if env in ["development", "testing", "desktop"]:
            if not v or v == "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION":
                v = secrets.token_urlsafe(32)
                print(f"[WARNING] SECRET_KEY não configurada. Usando temporária para {env}.")
                print(f"[INFO] Para uso permanente, adicione ao .env: SECRET_KEY={v}")

        return v

    # Redis para Token Blacklist (opcional, usa in-memory se não configurado)
    REDIS_URL: str = Field(
        default="",
        description="URL do Redis (ex: redis://localhost:6379/0). Deixe vazio para usar in-memory"
    )

    # === CORS ===
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Origins permitidas para CORS (separadas por vírgula)"
    )

    # === RATE LIMITING ===
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = SettingsConfigDict(
        env_file=os.environ.get('LUMINA_ENV_FILE', '.env'),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignora variáveis extras no .env
    )

    @field_validator("TELEGRAM_ADMIN_USER_IDS")
    @classmethod
    def parse_admin_ids(cls, v: str) -> List[int]:
        """Converte string de IDs separados por vírgula em lista de inteiros"""
        if not v or v.strip() == "":
            return []
        try:
            return [int(id.strip()) for id in v.split(",") if id.strip()]
        except ValueError:
            raise ValueError("TELEGRAM_ADMIN_USER_IDS deve conter números separados por vírgula")

    @property
    def admin_user_ids(self) -> List[int]:
        """Retorna lista de IDs de administradores"""
        return self.parse_admin_ids(self.TELEGRAM_ADMIN_USER_IDS)

    @property
    def cors_origins_list(self) -> List[str]:
        """Retorna lista de origins permitidas para CORS"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def database_path(self) -> Path:
        """Retorna o caminho absoluto do banco de dados"""
        # Remove o prefixo sqlite:///
        path_str = self.DATABASE_URL.replace("sqlite:///", "")
        return Path(path_str)

    @property
    def template_path(self) -> Path:
        """Retorna o caminho completo do template padrão"""
        return Path(self.TEMPLATE_DIR) / self.DEFAULT_TEMPLATE

    @property
    def output_path(self) -> Path:
        """Retorna o caminho do diretório de saída de documentos"""
        return Path(self.OUTPUT_DIR)

    def ensure_directories(self) -> None:
        """Cria diretórios necessários se não existirem.
        No modo desktop, usa LUMINA_DATA_DIR como diretório base.
        """
        base = Path(os.environ.get('LUMINA_DATA_DIR', '.'))
        directories = [
            base / "data",
            base / "data" / "downloads",
            base / "data" / "generated_docs",
            base / "data" / "logs",
            base / "data" / "backups",
            Path(self.TEMPLATE_DIR),
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)


# Instância global de configuração
settings = Settings()

# Garante que os diretórios existam ao importar
settings.ensure_directories()
