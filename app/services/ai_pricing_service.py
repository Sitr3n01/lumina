import json
from datetime import datetime, timezone
import anthropic
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.config import settings
from app.utils.logger import get_logger
from app.models.booking import Booking

logger = get_logger(__name__)


class AIPricingService:
    def __init__(self, db: Session):
        self.db = db
        self.api_key = settings.ANTHROPIC_API_KEY
        
        if self.api_key:
            self.client = anthropic.Anthropic(api_key=self.api_key)
        else:
            self.client = None

    def _get_historical_bookings(self, property_id: int):
        """Busca histórico de reservas do imóvel para últimos 12 meses."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Tentativa de buscar os últimos 365 dias (ou aproximado)
        history = self.db.execute(
            select(Booking)
            .where(
                and_(
                    Booking.property_id == property_id,
                    Booking.status != 'cancelled'
                )
            )
            .order_by(Booking.check_in_date.desc())
            .limit(100) # Limita a 100 para não estourar tokens
        ).scalars().all()
        
        # Formatar log
        formatted_history = []
        for b in history:
             formatted_history.append({
                 "date": str(b.check_in_date),
                 "nights": b.nights_count,
                 "guests": b.guest_count,
                 "total_price": float(b.total_price) if b.total_price else None,
                 "platform": b.platform
             })
        return formatted_history

    def get_pricing_suggestions(self, property_id: int):
        """Obtem sugestões de preço para os próximos 90 dias baseadas no histórico."""
        if not self.client:
             return {
                 "success": False,
                 "message": "API Key do Anthropic não configurada no .env",
                 "suggestions": [],
                 "generated_at": str(datetime.now(timezone.utc).replace(tzinfo=None))
             }
             
        try:
            history = self._get_historical_bookings(property_id)
            
            prompt = f"""
            Você é um especialista em precificação dinâmica (Revenue Management) para aluguéis de temporada (Airbnb, Booking).
            Eu preciso de sugestões de preços ótimos para os próximos 90 dias com base no histórico de reservas abaixo.
            O histórico inclui: data de check-in, quantidade de noites, hóspedes, preço total e plataforma. Considere a sazonalidade e se o preço médio por noite no histórico é X, ajuste para maximizar receita em dias normais e maximizar ocupação em dias fracos.
            
            Histórico recente (Amostra de até 100 reservas mais recentes):
            {json.dumps(history, indent=2)}
            
            Retorne EXATAMENTE um objeto JSON com a seguinte estrutura e nada mais (sem blocos markdown):
            {{
                "suggestions": [
                    {{
                        "date": "2026-XX-XX", 
                        "suggested_price": X.XX, 
                        "reasoning": "Sua justificativa curtíssima"
                    }}
                ]
            }}
            Inclua pelo menos as próximas 4 semanas críticas.
            """
            
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=2000,
                temperature=0.3,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            response_text = response.content[0].text
            
            if response_text.startswith("```json"):
                 response_text = response_text[7:-3].strip()
                 
            parsed_data = json.loads(response_text)
            
            return {
                "success": True,
                "suggestions": parsed_data.get("suggestions", []),
                "generated_at": str(datetime.now(timezone.utc).replace(tzinfo=None))
            }
            
        except anthropic.APIError as e:
            logger.error(f"Erros na API Anthropic: {e}")
            return {
                "success": False,
                "message": "Falha de comunicação com o serviço de IA.",
                "suggestions": [],
                "generated_at": str(datetime.now(timezone.utc).replace(tzinfo=None))
            }
        except Exception as e:
            logger.error(f"Erro inesperado no AI Pricing: {e}")
            return {
                "success": False,
                "message": "Ocorreu um erro interno ao gerar as sugestões.",
                "suggestions": [],
                "generated_at": str(datetime.now(timezone.utc).replace(tzinfo=None))
            }
