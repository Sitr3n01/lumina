"""
Utilitários para manipulação de datas e timezones.
Centraliza lógica de conversão e formatação para o timezone de Lisboa.
"""

from datetime import date, datetime, timedelta

import pytz
from dateutil import parser

from app.config import settings
from app.constants import DATE_FORMAT_SHORT


def get_timezone():
    """Retorna o timezone configurado (padrão: Europe/Lisbon)"""
    return pytz.timezone(settings.TIMEZONE)


def now_local() -> datetime:
    """Retorna a data/hora atual no timezone local"""
    return datetime.now(get_timezone())


def today_local() -> date:
    """Retorna a data de hoje no timezone local"""
    return now_local().date()


def to_local_datetime(dt: datetime) -> datetime:
    """
    Converte datetime para o timezone local.

    Args:
        dt: Datetime a ser convertido

    Returns:
        Datetime no timezone local
    """
    if dt.tzinfo is None:
        # Se não tem timezone, assume UTC
        dt = pytz.UTC.localize(dt)
    return dt.astimezone(get_timezone())


def parse_ical_date(date_value) -> date | None:
    """
    Converte valor de data do iCal para objeto date.

    Args:
        date_value: Valor de data do evento iCal (pode ser datetime ou date)

    Returns:
        Objeto date ou None se inválido
    """
    if date_value is None:
        return None

    try:
        if isinstance(date_value, datetime):
            return date_value.date()
        elif isinstance(date_value, date):
            return date_value
        elif isinstance(date_value, str):
            parsed = parser.parse(date_value)
            return parsed.date()
        else:
            return None
    except Exception:
        return None


def format_date_short(d: date) -> str:
    """
    Formata data em formato curto (DD/MM/YYYY).

    Args:
        d: Data a ser formatada

    Returns:
        String formatada

    Example:
        >>> format_date_short(date(2024, 3, 15))
        '15/03/2024'
    """
    return d.strftime(DATE_FORMAT_SHORT)


def format_date_long(d: date) -> str:
    """
    Formata data em formato longo (DD de Mês de YYYY).

    Args:
        d: Data a ser formatada

    Returns:
        String formatada em português

    Example:
        >>> format_date_long(date(2024, 3, 15))
        '15 de março de 2024'
    """
    # Mapeamento de meses em português
    months_pt = {
        1: "janeiro",
        2: "fevereiro",
        3: "março",
        4: "abril",
        5: "maio",
        6: "junho",
        7: "julho",
        8: "agosto",
        9: "setembro",
        10: "outubro",
        11: "novembro",
        12: "dezembro",
    }

    return f"{d.day} de {months_pt[d.month]} de {d.year}"


def format_date_range(check_in: date, check_out: date) -> str:
    """
    Formata um intervalo de datas de forma amigável.

    Args:
        check_in: Data de entrada
        check_out: Data de saída

    Returns:
        String formatada

    Example:
        >>> format_date_range(date(2024, 3, 15), date(2024, 3, 17))
        '15/03 - 17/03/2024 (2 noites)'
    """
    nights = (check_out - check_in).days

    if check_in.year == check_out.year and check_in.month == check_out.month:
        # Mesmo mês: "15-17/03/2024"
        return f"{check_in.day}-{check_out.day}/{check_in.month:02d}/{check_in.year} ({nights} noite{'s' if nights != 1 else ''})"
    elif check_in.year == check_out.year:
        # Mesmo ano: "15/03 - 17/04/2024"
        return f"{check_in.day}/{check_in.month:02d} - {check_out.day}/{check_out.month:02d}/{check_in.year} ({nights} noite{'s' if nights != 1 else ''})"
    else:
        # Anos diferentes: "15/03/2024 - 02/01/2025"
        return f"{format_date_short(check_in)} - {format_date_short(check_out)} ({nights} noite{'s' if nights != 1 else ''})"


def calculate_nights(check_in: date, check_out: date) -> int:
    """
    Calcula o número de noites entre duas datas.

    Args:
        check_in: Data de entrada
        check_out: Data de saída

    Returns:
        Número de noites
    """
    return (check_out - check_in).days


def is_past_booking(check_out: date) -> bool:
    """
    Verifica se uma reserva já passou.

    Args:
        check_out: Data de check-out

    Returns:
        True se a reserva já terminou
    """
    return check_out < today_local()


def is_current_booking(check_in: date, check_out: date) -> bool:
    """
    Verifica se uma reserva está ativa no momento.

    Args:
        check_in: Data de check-in
        check_out: Data de check-out

    Returns:
        True se a reserva está ativa hoje
    """
    today = today_local()
    return check_in <= today < check_out


def is_future_booking(check_in: date) -> bool:
    """
    Verifica se uma reserva é futura.

    Args:
        check_in: Data de check-in

    Returns:
        True se a reserva ainda não começou
    """
    return check_in > today_local()


def get_next_n_days(n: int) -> list[date]:
    """
    Retorna lista dos próximos N dias.

    Args:
        n: Número de dias

    Returns:
        Lista de datas
    """
    today = today_local()
    return [today + timedelta(days=i) for i in range(n)]


def dates_overlap(start1: date, end1: date, start2: date, end2: date) -> bool:
    """
    Verifica se dois períodos de datas se sobrepõem.

    Args:
        start1: Início do primeiro período
        end1: Fim do primeiro período
        start2: Início do segundo período
        end2: Fim do segundo período

    Returns:
        True se há sobreposição

    Example:
        >>> dates_overlap(date(2024, 3, 10), date(2024, 3, 15),
        ...               date(2024, 3, 12), date(2024, 3, 17))
        True
    """
    return start1 < end2 and end1 > start2


def get_overlap_period(start1: date, end1: date, start2: date, end2: date) -> tuple[date, date] | None:
    """
    Calcula o período de sobreposição entre duas reservas.

    Args:
        start1: Início do primeiro período
        end1: Fim do primeiro período
        start2: Início do segundo período
        end2: Fim do segundo período

    Returns:
        Tupla (início_overlap, fim_overlap) ou None se não há sobreposição
    """
    if not dates_overlap(start1, end1, start2, end2):
        return None

    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)

    return (overlap_start, overlap_end)
