"""
Router de API para gerenciamento de reservas (bookings).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingListResponse, BookingResponse, BookingUpdate
from app.services.booking_service import BookingService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("/", response_model=BookingListResponse)
def list_bookings(
    property_id: int = Query(..., description="ID do imóvel"),
    platform: str | None = Query(None, description="Filtrar por plataforma (airbnb/booking/manual)"),
    status: str | None = Query(None, description="Filtrar por status"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(50, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),  # Requer autenticação
):
    """
    Lista todas as reservas com filtros opcionais.
    Paginação eficiente no banco de dados.
    """
    booking_service = BookingService(db)

    # Buscar com paginação otimizada (no SQL)
    bookings, total = booking_service.get_bookings_paginated(
        property_id=property_id, platform=platform, status=status, page=page, page_size=page_size
    )

    return {"bookings": bookings, "total": total, "page": page, "page_size": page_size}


@router.get("/current", response_model=BookingResponse | None)
def get_current_booking(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna a reserva ativa no momento (hóspede atual).
    """
    booking_service = BookingService(db)
    current = booking_service.get_current_booking(property_id)

    if not current:
        return None

    return current


@router.get("/upcoming", response_model=list[BookingResponse])
def get_upcoming_bookings(
    property_id: int = Query(..., description="ID do imóvel"),
    limit: int = Query(5, ge=1, le=20, description="Número de reservas"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna as próximas N reservas futuras.
    """
    booking_service = BookingService(db)
    bookings = booking_service.get_next_bookings(property_id, limit)

    return bookings


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Retorna detalhes de uma reserva específica.
    """
    booking_service = BookingService(db)
    booking = booking_service.get_booking_by_id(booking_id)

    if not booking:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")

    return booking


@router.post("/", response_model=BookingResponse, status_code=201)
def create_booking(
    booking_data: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """
    Cria uma nova reserva manual.
    """
    booking_service = BookingService(db)

    # Calcular noites
    nights = (booking_data.check_out_date - booking_data.check_in_date).days

    data = booking_data.model_dump()
    data["nights_count"] = nights

    booking = booking_service.create_booking(data)

    logger.info(f"Manual booking created: {booking.id}")

    return booking


@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Atualiza dados de uma reserva.
    """
    booking_service = BookingService(db)

    booking = booking_service.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")

    # Filtrar apenas campos não-None
    update_data = {k: v for k, v in booking_data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    # Recalcular noites se datas mudaram
    if "check_in_date" in update_data or "check_out_date" in update_data:
        check_in = update_data.get("check_in_date", booking.check_in_date)
        check_out = update_data.get("check_out_date", booking.check_out_date)
        update_data["nights_count"] = (check_out - check_in).days

    updated_booking = booking_service.update_booking(booking, update_data)

    logger.info(f"Booking {booking_id} updated")

    return updated_booking


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(
    booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)
):
    """
    Cancela uma reserva (marca status como cancelled).
    """
    booking_service = BookingService(db)

    booking = booking_service.get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")

    booking_service.cancel_booking(booking)

    logger.info(f"Booking {booking_id} cancelled")

    return None


@router.get("/statistics/summary")
def get_booking_statistics(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna estatísticas gerais das reservas.
    """
    booking_service = BookingService(db)
    stats = booking_service.get_booking_statistics(property_id)

    return stats
