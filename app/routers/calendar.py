"""
Router de API para operações de calendário.
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.services.booking_service import BookingService
from app.services.calendar_service import CalendarService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


class CalendarEvent(BaseModel):
    """Evento do calendário"""

    id: int
    title: str
    start: str  # ISO date
    end: str  # ISO date
    platform: str
    status: str
    color: str
    conflict: bool = False


@router.get("/events", response_model=list[CalendarEvent])
def get_calendar_events(
    property_id: int = Query(..., description="ID do imóvel"),
    start_date: date = Query(..., description="Data inicial"),
    end_date: date = Query(..., description="Data final"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna eventos do calendário para um período.
    Formato compatível com FullCalendar.
    """
    booking_service = BookingService(db)

    # Buscar reservas no período
    bookings = booking_service.get_bookings_in_period(property_id, start_date, end_date)

    # Cores por plataforma
    platform_colors = {
        "airbnb": "#FF5A5F",  # Rosa Airbnb
        "booking": "#003580",  # Azul Booking
        "manual": "#6B7280",  # Cinza
    }

    # Converter para eventos
    events = []
    for booking in bookings:
        events.append(
            {
                "id": booking.id,
                "title": f"{booking.guest_name} ({booking.platform.upper()})",
                "start": booking.check_in_date.isoformat(),
                "end": booking.check_out_date.isoformat(),
                "platform": booking.platform,
                "status": booking.status.value,
                "color": platform_colors.get(booking.platform, "#6B7280"),
                "conflict": False,  # TODO: Detectar se tem conflito
            }
        )

    return events


@router.post("/sync")
async def sync_calendar(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Força sincronização manual dos calendários.
    """
    calendar_service = CalendarService(db)

    result = await calendar_service.sync_all_sources(property_id)

    return {
        "success": result["success"],
        "total_stats": result["total_stats"],
        "message": "Sincronização concluída" if result["success"] else "Erro na sincronização",
    }


@router.get("/sync-status")
def get_sync_status(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna status da última sincronização.
    """
    calendar_service = CalendarService(db)

    sources = calendar_service.get_active_calendar_sources(property_id)

    sources_status = []
    for source in sources:
        last_log = calendar_service.get_last_sync_log(source.id)

        sources_status.append(
            {
                "id": source.id,
                "platform": source.platform.value,
                "last_sync_at": source.last_sync_at.isoformat() if source.last_sync_at else None,
                "last_sync_status": source.last_sync_status,
                "sync_enabled": source.sync_enabled,
                "last_log": {
                    "status": last_log.status.value,
                    "bookings_added": last_log.bookings_added,
                    "bookings_updated": last_log.bookings_updated,
                    "conflicts_detected": last_log.conflicts_detected,
                    "duration_ms": last_log.sync_duration_ms,
                }
                if last_log
                else None,
            }
        )

    return {
        "sources": sources_status,
        "total_sources": len(sources),
        "all_synced_recently": all(
            s["last_sync_at"] and (datetime.now() - datetime.fromisoformat(s["last_sync_at"])).seconds < 3600
            for s in sources_status
        ),
    }
