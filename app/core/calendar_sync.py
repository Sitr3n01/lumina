"""
Engine de sincronização de calendários iCal.
Responsável por baixar, parsear e normalizar eventos do Airbnb e Booking.
"""
import re
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from pathlib import Path

import httpx
from icalendar import Calendar
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.constants import (
    PLATFORM_AIRBNB,
    PLATFORM_BOOKING,
    AIRBNB_GUEST_PATTERN,
    BOOKING_GUEST_PATTERN,
    DEFAULT_RETRY_ATTEMPTS,
    DEFAULT_TIMEOUT_SECONDS,
    CURRENCY_DEFAULT,
)
from app.utils.logger import get_logger
from app.utils.date_utils import parse_ical_date, calculate_nights

logger = get_logger(__name__)


class CalendarSyncEngine:
    """Engine para sincronização de calendários iCal"""

    def __init__(self):
        self.http_client = httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT_SECONDS,
            follow_redirects=True
        )
        self.download_dir = Path("data/downloads")
        self.download_dir.mkdir(parents=True, exist_ok=True)

    async def close(self):
        """Fecha o cliente HTTP"""
        await self.http_client.aclose()

    @retry(
        stop=stop_after_attempt(DEFAULT_RETRY_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def download_ical(self, url: str, platform: str) -> Optional[str]:
        """
        Baixa o conteúdo de um feed iCal com retry automático.

        Args:
            url: URL do feed iCal
            platform: Plataforma (airbnb/booking)

        Returns:
            Conteúdo do arquivo iCal ou None em caso de erro
        """
        logger.info(f"Downloading iCal from {platform}: {url[:50]}...")

        try:
            response = await self.http_client.get(url)
            response.raise_for_status()

            content = response.text

            # Salvar cópia local para debug/auditoria
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = self.download_dir / f"{platform}_{timestamp}.ics"
            filename.write_text(content, encoding="utf-8")

            logger.info(f"[OK] iCal downloaded successfully from {platform} ({len(content)} bytes)")
            return content

        except httpx.HTTPError as e:
            logger.error(f"HTTP error downloading iCal from {platform}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error downloading iCal from {platform}: {e}")
            raise

    def parse_ical(self, content: str, platform: str) -> List[Dict[str, Any]]:
        """
        Parseia o conteúdo iCal e extrai eventos de reserva.

        Args:
            content: Conteúdo do arquivo iCal
            platform: Plataforma de origem (airbnb/booking)

        Returns:
            Lista de dicionários com dados das reservas
        """
        logger.info(f"Parsing iCal content from {platform}...")

        try:
            calendar = Calendar.from_ical(content)
            events = []

            for component in calendar.walk():
                if component.name != "VEVENT":
                    continue

                event_data = self._extract_event_data(component, platform)
                if event_data:
                    events.append(event_data)

            logger.info(f"[OK] Parsed {len(events)} events from {platform}")
            return events

        except Exception as e:
            logger.error(f"Error parsing iCal from {platform}: {e}")
            raise

    def _extract_event_data(self, event, platform: str) -> Optional[Dict[str, Any]]:
        """
        Extrai dados de um evento iCal individual.

        Args:
            event: Componente VEVENT do iCalendar
            platform: Plataforma de origem

        Returns:
            Dicionário com dados da reserva ou None se inválido
        """
        try:
            # Dados básicos
            summary = str(event.get("SUMMARY", ""))
            description = str(event.get("DESCRIPTION", ""))
            uid = str(event.get("UID", ""))
            status = str(event.get("STATUS", "CONFIRMED")).upper()

            # Datas
            dtstart = event.get("DTSTART")
            dtend = event.get("DTEND")

            if not dtstart or not dtend:
                logger.warning(f"Event missing dates, skipping: {summary}")
                return None

            check_in = parse_ical_date(dtstart.dt)
            check_out = parse_ical_date(dtend.dt)

            if not check_in or not check_out:
                logger.warning(f"Could not parse dates for event: {summary}")
                return None

            # Extrair nome do hóspede baseado na plataforma
            guest_name = self._extract_guest_name(summary, description, platform)

            # Normalizar status
            booking_status = self._normalize_status(status, summary)

            # Calcular noites
            nights = calculate_nights(check_in, check_out)

            if nights <= 0:
                logger.warning(f"Invalid booking duration: {nights} nights")
                return None

            # Montar dados estruturados
            event_data = {
                "external_id": uid,
                "platform": platform,
                "status": booking_status,
                "check_in_date": check_in,
                "check_out_date": check_out,
                "nights_count": nights,
                "guest_name": guest_name,
                "guest_email": None,  # iCal normalmente não inclui
                "guest_phone": None,
                "guest_count": 1,  # Padrão, pode ser atualizado depois
                "total_price": None,  # iCal raramente inclui preço
                "currency": CURRENCY_DEFAULT,  # BRL para Brasil
                "raw_ical_data": json.dumps({
                    "summary": summary,
                    "description": description,
                    "uid": uid,
                    "status": status,
                    "dtstart": check_in.isoformat(),
                    "dtend": check_out.isoformat(),
                }, ensure_ascii=False),
            }

            return event_data

        except Exception as e:
            logger.error(f"Error extracting event data: {e}")
            return None

    def _extract_guest_name(self, summary: str, description: str, platform: str) -> str:
        """
        Extrai o nome do hóspede do summary ou description.

        Args:
            summary: Campo SUMMARY do evento
            description: Campo DESCRIPTION do evento
            platform: Plataforma (airbnb/booking)

        Returns:
            Nome do hóspede extraído ou "Hóspede" como fallback
        """
        # Tentar extrair do summary primeiro
        text = summary.strip()

        if platform == PLATFORM_AIRBNB:
            # Airbnb: "Reserved - João Silva" ou "Reservation - João Silva"
            match = re.search(AIRBNB_GUEST_PATTERN, text)
            if match:
                return match.group(1).strip()

            # Fallback: se começar com "Reserved", pega o resto
            if text.lower().startswith(("reserved", "reservation")):
                parts = re.split(r"[-:]", text, 1)
                if len(parts) > 1:
                    return parts[1].strip()

        elif platform == PLATFORM_BOOKING:
            # Booking: Vários formatos possíveis
            # "João Silva (Booking.com)" ou só "João Silva"
            match = re.search(BOOKING_GUEST_PATTERN, text)
            if match:
                return match.group(1).strip()

        # Se não encontrou no summary, tentar description
        if description:
            lines = description.strip().split("\n")
            for line in lines:
                if "name" in line.lower() or "guest" in line.lower():
                    # Tentar extrair nome da linha
                    parts = line.split(":")
                    if len(parts) > 1:
                        return parts[1].strip()

        # Fallback: usar o summary limpo ou "Hóspede"
        if text and not text.lower().startswith(("reserved", "blocked", "not available")):
            return text

        return "Hóspede"

    def _normalize_status(self, ical_status: str, summary: str) -> str:
        """
        Normaliza o status do iCal para o padrão do sistema.

        Args:
            ical_status: Status do evento iCal (CONFIRMED, CANCELLED, etc)
            summary: Summary do evento para detecção adicional

        Returns:
            Status normalizado (confirmed/cancelled/blocked)
        """
        ical_status = ical_status.upper()
        summary_lower = summary.lower()

        # Detectar bloqueios manuais
        if any(word in summary_lower for word in ["blocked", "bloqueado", "not available", "unavailable"]):
            return "blocked"

        # Mapear status iCal
        status_mapping = {
            "CONFIRMED": "confirmed",
            "CANCELLED": "cancelled",
            "TENTATIVE": "confirmed",  # Tratar como confirmado
        }

        return status_mapping.get(ical_status, "confirmed")

    async def sync_calendar_source(
        self,
        url: str,
        platform: str
    ) -> Dict[str, Any]:
        """
        Sincroniza uma fonte de calendário completa.

        Args:
            url: URL do feed iCal
            platform: Plataforma (airbnb/booking)

        Returns:
            Dicionário com resultado da sincronização:
            {
                "success": bool,
                "events": List[Dict],
                "error": Optional[str]
            }
        """
        logger.info(f"Starting calendar sync for {platform}")

        try:
            # Download
            content = await self.download_ical(url, platform)
            if not content:
                return {
                    "success": False,
                    "events": [],
                    "error": "Failed to download calendar"
                }

            # Parse
            events = self.parse_ical(content, platform)

            return {
                "success": True,
                "events": events,
                "error": None
            }

        except Exception as e:
            logger.error(f"Calendar sync failed for {platform}: {e}")
            return {
                "success": False,
                "events": [],
                "error": str(e)
            }


# Instância singleton do engine
_calendar_engine: Optional[CalendarSyncEngine] = None


def get_calendar_engine() -> CalendarSyncEngine:
    """Retorna a instância global do CalendarSyncEngine"""
    global _calendar_engine
    if _calendar_engine is None:
        _calendar_engine = CalendarSyncEngine()
    return _calendar_engine
