"""
Schemas Pydantic para o módulo de IA.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import date


# ── Pricing (legado) ──────────────────────────────────────────────────

class PriceSuggestion(BaseModel):
    date: date
    suggested_price: float
    reasoning: str


class AIPricingResponse(BaseModel):
    success: bool
    suggestions: List[PriceSuggestion] = []
    message: Optional[str] = None
    generated_at: str


# ── Chat ─────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' ou 'assistant'")
    content: str = Field(..., description="Conteúdo da mensagem")


class AIChatRequest(BaseModel):
    property_id: int = Field(..., description="ID do imóvel para contexto")
    messages: List[ChatMessage] = Field(..., description="Histórico de mensagens")


class AIChatResponse(BaseModel):
    success: bool
    reply: Optional[str] = None
    message: Optional[str] = None


# ── Test connection ───────────────────────────────────────────────────

class AITestRequest(BaseModel):
    provider: str = Field(..., description="anthropic | openai | compatible")
    api_key: str = Field(..., description="API Key para testar")
    model: str = Field(..., description="Nome do modelo")
    base_url: Optional[str] = Field(None, description="Base URL (para compatible)")


class AITestResponse(BaseModel):
    success: bool
    provider: str
    model: str
    message: str


# ── Settings ─────────────────────────────────────────────────────────

class AISettingsResponse(BaseModel):
    provider: str
    api_key_set: bool
    model: str
    base_url: str
