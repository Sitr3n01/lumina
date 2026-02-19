"""
Aplicação principal FastAPI - LUMINA
Sistema de Gestão Automatizada de Apartamento
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.utils.logger import setup_logger, get_logger
from app.routers import bookings, conflicts, statistics, sync_actions, calendar, documents, emails
from app.routers import settings as settings_router_mod
from app.routers import notifications as notifications_router_mod
from app.api.v1 import auth, health
from app.middleware.security_headers import add_security_headers
from app.middleware.csrf import CSRFProtectionMiddleware

# Configurar logging
setup_logger(log_level=settings.LOG_LEVEL, app_name=settings.APP_NAME)
logger = get_logger(__name__)

# Configurar rate limiter GLOBAL
# Proteção contra DoS: limites aplicados a TODOS os endpoints
# No modo desktop (localhost), rate limiting é desabilitado
if settings.LUMINA_DESKTOP:
    limiter = Limiter(key_func=get_remote_address, default_limits=[])
else:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["100/minute", "1000/hour"]  # Global: 100 req/min, 1000 req/hora
    )


# Tarefas de background
async def sync_calendar_periodically():
    """Sincroniza calendários periodicamente"""
    from app.database.session import get_db_context
    from app.services.calendar_service import CalendarService
    from app.models.property import Property

    logger.info("Starting periodic calendar sync task...")

    while True:
        try:
            await asyncio.sleep(settings.CALENDAR_SYNC_INTERVAL_MINUTES * 60)

            with get_db_context() as db:
                property_obj = db.query(Property).first()

                if property_obj:
                    logger.info(f"Running scheduled sync for property {property_obj.id}")
                    calendar_service = CalendarService(db)
                    result = await calendar_service.sync_all_sources(property_obj.id)

                    if result["success"]:
                        logger.info(f"Scheduled sync completed successfully")
                    else:
                        logger.error(f"Scheduled sync failed")

        except Exception as e:
            logger.error(f"Error in periodic sync task: {e}")
            await asyncio.sleep(60)  # Espera 1 minuto em caso de erro


def validate_security_settings():
    """Valida configurações críticas de segurança antes do startup"""
    errors = []

    # No modo desktop, pular validações rígidas de segurança
    if settings.APP_ENV == "production" and not settings.LUMINA_DESKTOP:
        # Validar SECRET_KEY (já validado pelo Pydantic, mas double-check)
        if settings.SECRET_KEY == "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION":
            errors.append("SECRET_KEY usa valor padrão inseguro")

        if len(settings.SECRET_KEY) < 32:
            errors.append(f"SECRET_KEY muito curta ({len(settings.SECRET_KEY)} chars, mínimo: 32)")

        # Avisar se CORS está aberto
        if hasattr(settings, 'cors_origins_list') and "*" in settings.cors_origins_list:
            logger.warning("⚠️  SECURITY: CORS está aberto para todas as origins!")

    if errors:
        logger.error("=" * 70)
        logger.error("ERROS CRÍTICOS DE SEGURANÇA DETECTADOS:")
        for error in errors:
            logger.error(f"  - {error}")
        logger.error("=" * 70)
        raise ValueError(f"Security validation failed: {'; '.join(errors)}")

    logger.info("✅ Security settings validated")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    logger.info(f"Starting {settings.APP_NAME}...")

    # SECURITY FIX: Validar configurações de segurança
    validate_security_settings()

    # Garantir que diretórios existem
    settings.ensure_directories()

    # Iniciar bot do Telegram (se configurado)
    telegram_bot = None
    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_BOT_TOKEN != "":
        try:
            from app.telegram import TelegramBot
            telegram_bot = TelegramBot()
            await telegram_bot.start()
        except Exception as e:
            logger.error(f"Failed to start Telegram bot: {e}")

    # Iniciar task de sincronização periódica
    sync_task = asyncio.create_task(sync_calendar_periodically())

    # Iniciar task de backup automático (em produção e no modo desktop)
    backup_task = None
    if settings.APP_ENV in ["production", "desktop"]:
        from app.core.backup import scheduled_backup_task
        backup_task = asyncio.create_task(scheduled_backup_task())
        logger.info("Automatic backup task started")

    logger.info(f"{settings.APP_NAME} started successfully!")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Sync interval: {settings.CALENDAR_SYNC_INTERVAL_MINUTES} minutes")

    yield

    # Cleanup ao encerrar
    logger.info("Shutting down...")

    # Parar bot do Telegram
    if telegram_bot:
        try:
            await telegram_bot.stop()
        except Exception as e:
            logger.error(f"Error stopping Telegram bot: {e}")

    # Parar task de sincronização
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass

    # Parar task de backup
    if backup_task:
        backup_task.cancel()
        try:
            await backup_task
        except asyncio.CancelledError:
            pass

    logger.info("Shutdown complete")


# Criar aplicação FastAPI
app = FastAPI(
    title="LUMINA API",
    description="API para gerenciamento automatizado de apartamento no Airbnb e Booking.com",
    version="1.0.0",
    lifespan=lifespan
)

# Adicionar rate limiter ao app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Adicionar security headers middleware
add_security_headers(app, environment=settings.APP_ENV)

# Adicionar CSRF protection middleware
app.add_middleware(CSRFProtectionMiddleware)

# Configurar CORS para permitir acesso do frontend
# No modo desktop (Electron), CORS é aberto pois tudo é localhost
cors_origins = ["*"] if settings.LUMINA_DESKTOP else settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Especificar métodos
    allow_headers=["Authorization", "Content-Type"],  # Especificar headers
)


# Incluir routers
app.include_router(auth.router, prefix="/api/v1")  # Autenticação
app.include_router(health.router, prefix="/api/v1")  # Health checks
app.include_router(documents.router)  # Geração de documentos
app.include_router(emails.router)  # Sistema de emails
app.include_router(bookings.router)
app.include_router(conflicts.router)
app.include_router(statistics.router)
app.include_router(sync_actions.router)
app.include_router(calendar.router)
app.include_router(settings_router_mod.router)  # Configurações persistentes
app.include_router(notifications_router_mod.router)  # Central de notificações


# === ENDPOINT DE SHUTDOWN (apenas modo desktop) ===
@app.post("/api/v1/shutdown")
async def shutdown_server():
    """Shutdown gracioso do servidor (apenas modo desktop).
    Chamado pelo Electron antes de encerrar o processo.
    """
    if not settings.LUMINA_DESKTOP:
        return JSONResponse(
            status_code=403,
            content={"error": "Only available in desktop mode"}
        )
    import os
    import signal
    import threading
    # Dar tempo para a resposta ser enviada antes de encerrar
    threading.Timer(0.5, lambda: os.kill(os.getpid(), signal.SIGTERM)).start()
    return {"status": "shutting_down"}


# Rotas básicas
@app.get("/")
def root():
    """Rota raiz"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "environment": settings.APP_ENV
    }


@app.get("/health")
def health_check():
    """Health check para monitoramento"""
    return {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time()
    }


@app.get("/api/info")
def api_info():
    """Informações da API"""
    return {
        "app_name": settings.APP_NAME,
        "property_name": settings.PROPERTY_NAME,
        "property_address": settings.PROPERTY_ADDRESS,
        "condo_name": settings.CONDO_NAME,
        "condo_admin_name": settings.CONDO_ADMIN_NAME,
        "owner_name": settings.OWNER_NAME,
        "owner_email": settings.OWNER_EMAIL,
        "owner_phone": settings.OWNER_PHONE,
        "owner_apto": settings.OWNER_APTO,
        "owner_bloco": settings.OWNER_BLOCO,
        "owner_garagem": settings.OWNER_GARAGEM,
        "condo_email": settings.CONDO_EMAIL,
        "contact_phone": settings.CONTACT_PHONE,
        "contact_email": settings.CONTACT_EMAIL,
        "timezone": settings.TIMEZONE,
        "sync_interval_minutes": settings.CALENDAR_SYNC_INTERVAL_MINUTES,
        "features": {
            "calendar_sync": True,
            "conflict_detection": True,
            "document_generation": settings.ENABLE_AUTO_DOCUMENT_GENERATION,
            "conflict_notifications": settings.ENABLE_CONFLICT_NOTIFICATIONS
        }
    }


# Handler de erros global - PROTEÇÃO CONTRA INFORMATION DISCLOSURE
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Handler global de exceções.

    SEGURANÇA: Nunca expõe stack traces ou detalhes de erro ao cliente.
    Todos os erros são logados internamente com stack trace completo.
    Cliente recebe apenas mensagem genérica.
    """
    # Log completo com stack trace (APENAS logs internos)
    # SECURITY: Logar apenas o path, não a URL completa (pode conter tokens em query strings)
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}",
        exc_info=True,  # Inclui stack trace completo nos logs
        extra={
            "method": request.method,
            "path": request.url.path,
            "client_host": request.client.host if request.client else "unknown"
        }
    )

    # SEMPRE retornar mensagem genérica (mesmo em development)
    # Desenvolvedores devem usar os logs para debugging
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later."
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True if settings.APP_ENV == "development" else False,
        log_level=settings.LOG_LEVEL.lower()
    )
