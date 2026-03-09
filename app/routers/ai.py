"""
Router de IA — price-suggestions (legado), chat, test-connection e settings.
"""
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.middleware.auth import get_current_active_user, get_current_admin_user
from app.services.ai_pricing_service import AIPricingService
from app.services.ai_service import AIService
from app.schemas.ai import (
    AIPricingResponse,
    AIChatRequest,
    AIChatResponse,
    AITestRequest,
    AITestResponse,
    AISettingsResponse,
)
from app.config import settings as app_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Integration"])


# ── Price Suggestions (legado) ─────────────────────────────────────────

@router.post("/price-suggestions", response_model=AIPricingResponse, status_code=status.HTTP_200_OK)
def get_price_suggestions(
    property_id: int = Query(..., description="ID do Imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Analisa o histórico do imóvel e retorna sugestões de preço.
    Requer nível administrador.
    """
    ai_service = AIPricingService(db)
    result = ai_service.get_pricing_suggestions(property_id)

    if not result.get("success") and result.get("message") != "API Key do Anthropic não configurada no .env":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"],
        )

    return result


# ── Chat ──────────────────────────────────────────────────────────────

@router.post("/chat", response_model=AIChatResponse)
def ai_chat(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Envia mensagens para o agente de IA com contexto completo do imóvel.
    Suporta qualquer provider configurado (Anthropic, OpenAI, compatíveis).
    """
    try:
        service = AIService()
        system_prompt = AIService.build_system_prompt(db, body.property_id)
        messages = [{"role": m.role, "content": m.content} for m in body.messages]
        reply = service.chat(messages=messages, system_prompt=system_prompt)
        return AIChatResponse(success=True, reply=reply)

    except ValueError as e:
        # API key não configurada — retornar mensagem amigável (não 500)
        return AIChatResponse(success=False, message=str(e))
    except Exception as e:
        logger.error(f"[AI Chat] Erro: {e}")
        return AIChatResponse(
            success=False,
            message="Falha na comunicação com o serviço de IA. Verifique as configurações.",
        )


# ── Test Connection ───────────────────────────────────────────────────

@router.post("/test", response_model=AITestResponse)
def test_ai_connection(
    body: AITestRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Testa a conectividade com um provider de IA usando as credenciais fornecidas.
    Não persiste nenhuma configuração.
    """
    service = AIService(
        provider=body.provider,
        api_key=body.api_key,
        model=body.model,
        base_url=body.base_url or None,
    )
    result = service.test_connection()
    return AITestResponse(**result)


# ── AI Settings ───────────────────────────────────────────────────────

@router.get("/settings", response_model=AISettingsResponse)
def get_ai_settings(
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna as configurações de IA atuais (sem expor a API Key completa).
    """
    key = app_settings.effective_ai_key
    return AISettingsResponse(
        provider=app_settings.AI_PROVIDER,
        api_key_set=bool(key),
        model=app_settings.effective_ai_model,
        base_url=app_settings.AI_BASE_URL or "",
    )


@router.put("/settings")
def update_ai_settings(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Persiste as configurações de IA no banco de dados (via SettingsService).
    Campos aceitos: provider, api_key, model, base_url.
    """
    from app.services.settings_service import SettingsService

    allowed = {"aiProvider", "aiApiKey", "aiModel", "aiBaseUrl"}
    filtered = {k: v for k, v in data.items() if k in allowed and v is not None}

    if not filtered:
        return {"success": True, "message": "Nenhuma configuração de IA para salvar", "saved": {}}

    service = SettingsService(db)
    saved = service.update_settings(filtered)
    return {"success": True, "message": "Configurações de IA salvas", "saved": saved}
