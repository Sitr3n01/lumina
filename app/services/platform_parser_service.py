# app/services/platform_parser_service.py
"""
Serviço de parsing de emails de plataformas (Booking, Airbnb).
Extrai informações de reservas a partir do conteúdo dos emails.
"""

import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from app.utils.logger import get_logger

logger = get_logger(__name__)


class PlatformParser(ABC):
    """Interface base para parsers de plataformas"""

    @abstractmethod
    def parse(self, subject: str, body: str) -> dict[str, Any] | None:
        """
        Analisa o email e retorna dados da reserva.

        Returns:
            Dict com chaves padronizadas:
            - external_id: ID da reserva na plataforma
            - guest_name: Nome do hóspede
            - check_in_date: Data de entrada (datetime)
            - check_out_date: Data de saída (datetime)
            - guest_count: Número de hóspedes (int)
            - total_price: Valor total (float)
            - currency: Moeda (str)
            - platform: Nome da plataforma (booking/airbnb)
        """
        pass

    def _parse_date(self, date_str: str, formats: list[str]) -> datetime | None:
        """Tenta fazer parsing de data com múltiplos formatos"""
        if not date_str:
            return None

        date_str = date_str.strip()
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None


class BookingParser(PlatformParser):
    """Parser para emails do Booking.com"""

    def parse(self, subject: str, body: str) -> dict[str, Any] | None:
        if "booking.com" not in body.lower() and "booking.com" not in subject.lower():
            return None

        try:
            data = {"platform": "booking"}

            # 1. External ID (Número da reserva)
            # Padrões: "Reservation number: 1234567890", "Número da reserva: 1234567890"
            id_match = re.search(r"(?:Reservation number|N[úu]mero da reserva)[:\s]+(\d+)", body, re.IGNORECASE)
            if id_match:
                data["external_id"] = id_match.group(1)

            # 2. Guest Name
            # Padrões: "Guest: John Doe", "Hóspede: João Silva"
            name_match = re.search(r"(?:Guest|H[óo]spede|Nome)[:\s]+([^\n\r]+)", body, re.IGNORECASE)
            if name_match:
                data["guest_name"] = name_match.group(1).strip()

            # Se não achou no corpo, tenta no assunto "Reservation confirmation for John Doe"
            if "guest_name" not in data:
                subject_match = re.search(r"(?:for|para)\s+([A-Za-z\s]+)", subject, re.IGNORECASE)
                if subject_match:
                    data["guest_name"] = subject_match.group(1).strip()

            # 3. Dates (Check-in / Check-out)
            # Padrões: "Check-in: Monday, 10 January 2024", "Check-in: 2024-01-10"
            # Precisamos ser flexíveis com formatos de data
            check_in_match = re.search(r"Check-in[:\s]+([^\n\r]+)", body, re.IGNORECASE)
            check_out_match = re.search(r"Check-out[:\s]+([^\n\r]+)", body, re.IGNORECASE)

            date_formats = [
                "%A, %d %B %Y",  # Monday, 10 January 2024
                "%d %B %Y",  # 10 January 2024
                "%Y-%m-%d",  # 2024-01-10
                "%d/%m/%Y",  # 10/01/2024
                "%a, %b %d, %Y",  # Mon, Jan 10, 2024
            ]

            if check_in_match:
                # Limpar string de data (remover dia da semana se estiver separado por vírgula no inicio)
                raw_date = check_in_match.group(1).strip()
                # Tentar remover "from 14:00" ou similares se houver
                raw_date = re.sub(r"\s+(?:from|at|a partir de|as)\s+.*$", "", raw_date, flags=re.IGNORECASE)
                data["check_in_date"] = self._parse_date(raw_date, date_formats)

            if check_out_match:
                raw_date = check_out_match.group(1).strip()
                raw_date = re.sub(r"\s+(?:until|before|at[ée]|at[ée] as)\s+.*$", "", raw_date, flags=re.IGNORECASE)
                data["check_out_date"] = self._parse_date(raw_date, date_formats)

            # 4. Guest Count
            # "2 guests", "2 adults"
            guests_match = re.search(r"(\d+)\s+(?:guests|h[óo]spedes|adults|adultos)", body, re.IGNORECASE)
            if guests_match:
                data["guest_count"] = int(guests_match.group(1))
            else:
                data["guest_count"] = 1  # Default

            # 5. Price
            # "Total price: R$ 500.00", "Price: € 100"
            price_match = re.search(r"(?:Total price|Pre[çc]o total)[:\s]+([A-Z$€£]+)\s*([\d.,]+)", body, re.IGNORECASE)
            if price_match:
                currency = price_match.group(1).strip()
                amount_str = price_match.group(2).strip()

                # Tentar inferir formato
                amount = amount_str
                if "," in amount_str and "." in amount_str:
                    # Se tem ambos, o último define a decimal
                    if amount_str.rfind(",") > amount_str.rfind("."):
                        # 1.000,00 -> BR/EU
                        amount = amount_str.replace(".", "").replace(",", ".")
                    else:
                        # 1,000.00 -> US
                        amount = amount_str.replace(",", "")
                elif "," in amount_str:
                    # Apenas virgula. Pode ser decimal (100,00) ou milhar (1,000)
                    # Se tiver 2 dígitos após a virgula, assumimos decimal
                    parts = amount_str.split(",")
                    if len(parts) > 1 and len(parts[-1]) == 2:
                        amount = amount_str.replace(",", ".")
                    else:
                        amount = amount_str.replace(",", "")
                # Se for só ponto (500.00), o float() do python já entende

                try:
                    data["total_price"] = float(amount)
                    data["currency"] = currency
                except ValueError:
                    pass

            # Validação mínima: precisa ter ID e datas
            if "external_id" in data and "check_in_date" in data:
                return data

            return None

        except Exception as e:
            logger.error(f"Error parsing Booking email: {e}")
            return None


class AirbnbParser(PlatformParser):
    """Parser para emails do Airbnb"""

    def parse(self, subject: str, body: str) -> dict[str, Any] | None:
        if "airbnb" not in body.lower() and "airbnb" not in subject.lower():
            return None

        try:
            data = {"platform": "airbnb"}

            # 1. External ID (Código de confirmação)
            # "Confirmation code: HM123456", "Código de confirmação: HM123456"
            # Geralmente são letras maiúsculas e números
            id_match = re.search(
                r"(?:Confirmation code|C[óo]digo de confirma[çc][ãa]o)[:\s]+([A-Z0-9]{8,10})", body, re.IGNORECASE
            )
            if id_match:
                data["external_id"] = id_match.group(1)

            # 2. Guest Name
            # Airbnb costuma colocar no corpo "Arrive: John Doe" ou similar, mas é difícil padronizar.
            # Muitas vezes o assunto é "Reservation confirmed - John Doe" ou "New booking from John Doe"
            subject_match = re.search(r"(?:from|de)\s+([A-Za-z\s]+)", subject, re.IGNORECASE)
            if subject_match:
                # Remove partes extras como "Reservation confirmed" se estiver no início
                data["guest_name"] = subject_match.group(1).strip()
            else:
                # Tentar formato "Reservation confirmed - John Doe"
                dash_match = re.search(r"-\s+([A-Za-z\s]+)$", subject)
                if dash_match:
                    data["guest_name"] = dash_match.group(1).strip()

            # 3. Dates
            # Airbnb costuma mandar rangos: "Jan 10 - Jan 15, 2024"
            # Ou "Check-in: ... Check-out: ..."
            date_range_match = re.search(r"([A-Z][a-z]{2}\s+\d+)\s+-\s+([A-Z][a-z]{2}\s+\d+),\s+(\d{4})", body)

            if date_range_match:
                start_str = f"{date_range_match.group(1)} {date_range_match.group(3)}"  # "Jan 10 2024"
                end_str = f"{date_range_match.group(2)} {date_range_match.group(3)}"  # "Jan 15 2024"

                fmt = "%b %d %Y"
                data["check_in_date"] = self._parse_date(start_str, [fmt])
                data["check_out_date"] = self._parse_date(end_str, [fmt])
            else:
                # Tentar formato separado
                check_in_match = re.search(r"Check-in[:\s]+([^\n\r]+)", body, re.IGNORECASE)
                check_out_match = re.search(r"Check-out[:\s]+([^\n\r]+)", body, re.IGNORECASE)

                date_formats = ["%d/%m/%Y", "%Y-%m-%d", "%b %d, %Y"]

                if check_in_match:
                    data["check_in_date"] = self._parse_date(check_in_match.group(1).strip(), date_formats)
                if check_out_match:
                    data["check_out_date"] = self._parse_date(check_out_match.group(1).strip(), date_formats)

            # 4. Guests
            guests_match = re.search(r"(\d+)\s+(?:guests|h[óo]spedes)", body, re.IGNORECASE)
            if guests_match:
                data["guest_count"] = int(guests_match.group(1))
            else:
                data["guest_count"] = 1

            # Validação
            if "external_id" in data:
                return data

            return None

        except Exception as e:
            logger.error(f"Error parsing Airbnb email: {e}")
            return None


class PlatformParserService:
    """Serviço unificado para identificar e parsear emails de qualquer plataforma"""

    def __init__(self):
        self.parsers = [BookingParser(), AirbnbParser()]

    def parse_email(self, subject: str, body: str) -> dict[str, Any] | None:
        """
        Tenta parsear o email usando todos os parsers disponíveis.
        Retorna o resultado do primeiro parser que tiver sucesso.
        """
        for parser in self.parsers:
            result = parser.parse(subject, body)
            if result:
                logger.info(f"Email parsed successfully with {parser.__class__.__name__}")
                return result

        return None
