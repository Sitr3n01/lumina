"""
Serviço de IA unificado para LUMINA.

Suporta múltiplos providers:
  - "anthropic" → Anthropic SDK (Claude)
  - "openai"    → OpenAI SDK (GPT, etc.)
  - "compatible" → OpenAI SDK com base_url customizada (Ollama, Groq, LM Studio, etc.)

O serviço injeta contexto real do imóvel/reservas no system prompt para que
qualquer modelo responda de forma contextualizada.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import settings as app_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ─────────────────────────── System Prompt ───────────────────────────

SYSTEM_PROMPT_TEMPLATE = """
Você é LUMINA AI, assistente inteligente integrado ao sistema de gestão de
apartamentos LUMINA.

## Sua identidade
Você conhece completamente o sistema: reservas, calendários, conflitos,
documentos, estatísticas e receitas do imóvel abaixo.

## Contexto atual do imóvel
- **Imóvel:** {property_name} — {property_address}
- **Proprietário:** {owner_name}
- **Reservas confirmadas (total histórico):** {total_bookings}
- **Próximo check-in:** {next_checkin}
- **Reserva atual:** {current_booking}
- **Taxa de ocupação (últimos 30 dias):** {occupancy_rate}%
- **Receita total (últimos 30 dias):** R$ {monthly_revenue}
- **Conflitos ativos:** {conflicts_count}

## Reservas recentes
{recent_bookings_summary}

## Suas capacidades
1. **Análise financeira** — calcular receita, média por noite, comparar períodos
2. **Precificação** — sugerir tarifas ideais com base em sazonalidade e histórico
3. **Gestão de conflitos** — interpretar conflitos de calendário, sugerir resoluções
4. **Documentação** — explicar como gerar autorizações de hospedagem
5. **Suporte operacional** — responder dúvidas sobre o funcionamento do sistema

## Regras
- Sempre responda em português (pt-BR)
- Seja conciso mas completo
- Para sugestões de preço, justifique com dados do histórico
- Se não souber algo, diga claramente
- Nunca invente dados que não estão no contexto fornecido
- Data de hoje: {today}
""".strip()


# ─────────────────────────── AI Service ───────────────────────────

class AIService:
    """
    Serviço de IA multi-provider.

    Usa settings.AI_PROVIDER para escolher entre Anthropic SDK e OpenAI SDK
    (o SDK OpenAI suporta qualquer endpoint compatível via base_url).
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.provider = (provider or app_settings.AI_PROVIDER).lower()
        self.api_key  = api_key  or app_settings.effective_ai_key
        self.model    = model    or app_settings.effective_ai_model
        self.base_url = base_url or app_settings.AI_BASE_URL or None

    # ── Public interface ──────────────────────────────────────────

    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """
        Envia mensagens para o modelo e retorna a resposta em texto.

        Args:
            messages: lista de {'role': 'user'|'assistant', 'content': str}
            system_prompt: prompt de sistema (opcional, sobrescreve o padrão)
            max_tokens: limite de tokens na resposta
            temperature: temperatura do modelo

        Returns:
            Texto da resposta do modelo

        Raises:
            ValueError: se API key não configurada
            RuntimeError: se provider inválido ou erro de comunicação
        """
        if not self.api_key:
            raise ValueError(
                "API Key de IA não configurada. "
                "Acesse Configurações → Inteligência Artificial para configurar."
            )

        if self.provider == "anthropic":
            return self._chat_anthropic(messages, system_prompt, max_tokens, temperature)
        else:
            # "openai" e "compatible" usam o mesmo SDK OpenAI
            return self._chat_openai(messages, system_prompt, max_tokens, temperature)

    def test_connection(self) -> Dict[str, Any]:
        """
        Testa a conexão com o provider e retorna status.

        Returns:
            {'success': bool, 'provider': str, 'model': str, 'message': str}
        """
        try:
            response = self.chat(
                messages=[{"role": "user", "content": "Responda apenas: OK"}],
                max_tokens=10,
                temperature=0,
            )
            return {
                "success": True,
                "provider": self.provider,
                "model": self.model,
                "message": f"Conexão bem-sucedida. Resposta: {response.strip()[:50]}",
            }
        except ValueError as e:
            return {"success": False, "provider": self.provider, "model": self.model, "message": str(e)}
        except Exception as e:
            logger.error(f"[AI] Erro ao testar conexão: {e}")
            return {
                "success": False,
                "provider": self.provider,
                "model": self.model,
                "message": "Falha na comunicação com o serviço de IA. Verifique a API Key e o modelo.",
            }

    # ── Provider implementations ──────────────────────────────────

    def _chat_anthropic(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("SDK anthropic não instalado. Execute: pip install anthropic")

        client = anthropic.Anthropic(api_key=self.api_key)
        kwargs: Dict[str, Any] = dict(
            model=self.model,
            max_tokens=max_tokens,
            messages=messages,
        )
        if system_prompt:
            kwargs["system"] = system_prompt

        response = client.messages.create(**kwargs)
        return response.content[0].text

    def _chat_openai(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise RuntimeError("SDK openai não instalado. Execute: pip install openai")

        kwargs: Dict[str, Any] = {"api_key": self.api_key}
        if self.base_url:
            kwargs["base_url"] = self.base_url

        client = OpenAI(**kwargs)

        all_messages: List[Dict[str, str]] = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        response = client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    # ── Context builder ──────────────────────────────────────────

    @staticmethod
    def build_system_prompt(db: Session, property_id: int) -> str:
        """
        Constrói o system prompt rico com contexto real do imóvel e reservas.
        """
        try:
            from app.models.booking import Booking, BookingStatus
            from app.models.property import Property
            from app.utils.date_utils import today_local

            today = today_local()
            thirty_days_ago = today - timedelta(days=30)

            # Property info
            prop = db.query(Property).filter(Property.id == property_id).first()
            property_name    = prop.name    if prop else app_settings.PROPERTY_NAME
            property_address = prop.address if prop else app_settings.PROPERTY_ADDRESS

            # All confirmed bookings for this property
            bookings = (
                db.query(Booking)
                .filter(
                    Booking.property_id == property_id,
                    Booking.status == BookingStatus.CONFIRMED,
                )
                .order_by(Booking.check_in_date.desc())
                .limit(200)
                .all()
            )

            total_bookings = len(bookings)

            # Next check-in
            upcoming = [
                b for b in bookings
                if b.check_in_date >= today
            ]
            upcoming.sort(key=lambda b: b.check_in_date)
            next_checkin = (
                f"{upcoming[0].guest_name} em {upcoming[0].check_in_date.strftime('%d/%m/%Y')}"
                if upcoming else "Nenhuma reserva futura"
            )

            # Current booking
            current = [
                b for b in bookings
                if b.check_in_date <= today < b.check_out_date
            ]
            current_booking = (
                f"{current[0].guest_name} (saída: {current[0].check_out_date.strftime('%d/%m/%Y')})"
                if current else "Nenhuma reserva ativa"
            )

            # Occupancy last 30 days
            recent = [
                b for b in bookings
                if b.check_out_date >= thirty_days_ago and b.check_in_date <= today
            ]
            occupied_nights = sum(
                min(b.check_out_date, today) - max(b.check_in_date, thirty_days_ago)
                for b in recent
                if min(b.check_out_date, today) > max(b.check_in_date, thirty_days_ago)
            )
            occupied_days = getattr(occupied_nights, 'days', 0) if hasattr(occupied_nights, 'days') else 0
            occupancy_rate = round((occupied_days / 30) * 100, 1)

            # Revenue last 30 days
            monthly_revenue = round(
                sum(float(b.total_price or 0) for b in recent if b.check_in_date >= thirty_days_ago),
                2,
            )

            # Conflicts
            try:
                from app.core.conflict_detector import ConflictDetector
                conflict_detector = ConflictDetector(db)
                conflicts_count = len(conflict_detector.get_active_conflicts(property_id))
            except Exception:
                conflicts_count = 0

            # Recent bookings summary (last 10)
            recent_list = sorted(bookings[:10], key=lambda b: b.check_in_date, reverse=True)
            summary_lines = [
                f"- {b.guest_name} | {b.check_in_date.strftime('%d/%m/%Y')}→{b.check_out_date.strftime('%d/%m/%Y')}"
                f" | {b.nights_count}n | R${float(b.total_price or 0):.0f} | {b.platform}"
                for b in recent_list
            ]
            recent_bookings_summary = "\n".join(summary_lines) if summary_lines else "Nenhuma reserva no histórico."

            return SYSTEM_PROMPT_TEMPLATE.format(
                property_name=property_name,
                property_address=property_address,
                owner_name=app_settings.OWNER_NAME,
                total_bookings=total_bookings,
                next_checkin=next_checkin,
                current_booking=current_booking,
                occupancy_rate=occupancy_rate,
                monthly_revenue=f"{monthly_revenue:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                conflicts_count=conflicts_count,
                recent_bookings_summary=recent_bookings_summary,
                today=today.strftime("%d/%m/%Y"),
            )

        except Exception as e:
            logger.error(f"[AI] Erro ao construir system prompt: {e}")
            return SYSTEM_PROMPT_TEMPLATE.format(
                property_name=app_settings.PROPERTY_NAME,
                property_address=app_settings.PROPERTY_ADDRESS,
                owner_name=app_settings.OWNER_NAME,
                total_bookings="N/A",
                next_checkin="N/A",
                current_booking="N/A",
                occupancy_rate="N/A",
                monthly_revenue="N/A",
                conflicts_count="N/A",
                recent_bookings_summary="Não disponível",
                today=datetime.now().strftime("%d/%m/%Y"),
            )
