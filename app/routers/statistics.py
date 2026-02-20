"""
Router de API para estatísticas e dashboard.
"""
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.booking_service import BookingService
from app.services.statistics_service import StatisticsService
from app.core.conflict_detector import ConflictDetector
from app.services.sync_action_service import SyncActionService
from app.services.notification_service import NotificationService
from app.models.booking import Booking, BookingStatus
from app.models.sync_action import SyncAction
from app.models.user import User
from app.middleware.auth import get_current_active_user
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/statistics", tags=["Statistics"])


@router.get("/dashboard")
def get_dashboard(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna dados completos do dashboard.
    """
    booking_service = BookingService(db)
    conflict_detector = ConflictDetector(db)
    sync_action_service = SyncActionService(db)
    notification_service = NotificationService(db)

    # Reserva atual
    current_booking = booking_service.get_current_booking(property_id)

    # Próximas reservas
    next_bookings = booking_service.get_next_bookings(property_id, limit=5)

    # Conflitos ativos
    active_conflicts = conflict_detector.get_active_conflicts(property_id)

    # Ações pendentes
    pending_actions = sync_action_service.get_pending_actions(property_id)

    # Estatísticas de reservas
    booking_stats = booking_service.get_booking_statistics(property_id)

    # Resumo de conflitos
    conflict_summary = conflict_detector.get_conflict_summary(property_id)

    # Resumo de ações
    action_summary = sync_action_service.get_action_summary(property_id)

    # Formatar reserva atual
    current = None
    if current_booking:
        from app.utils.date_utils import today_local
        today = today_local()
        nights_remaining = (current_booking.check_out_date - today).days

        current = {
            "id": current_booking.id,
            "guest_name": current_booking.guest_name,
            "check_out_date": current_booking.check_out_date.isoformat(),
            "platform": current_booking.platform,
            "nights_remaining": max(0, nights_remaining)  # Não pode ser negativo
        }

    # Formatar próximas reservas
    upcoming = []
    for booking in next_bookings:
        upcoming.append({
            "id": booking.id,
            "guest_name": booking.guest_name,
            "check_in_date": booking.check_in_date.isoformat(),
            "check_out_date": booking.check_out_date.isoformat(),
            "nights_count": booking.nights_count,
            "platform": booking.platform
        })

    # Dashboard completo
    dashboard = {
        "current_booking": current,
        "upcoming_bookings": upcoming,
        "booking_statistics": booking_stats,
        "conflict_summary": conflict_summary,
        "action_summary": action_summary,
        "alerts": {
            "critical_conflicts": conflict_summary.get("critical", 0),
            "critical_actions": action_summary.get("critical", 0),
            "total_pending": action_summary.get("pending", 0)
        }
    }

    return dashboard


@router.get("/occupancy")
def get_occupancy_stats(
    property_id: int = Query(..., description="ID do imóvel"),
    months: int = Query(6, ge=1, le=12, description="Número de meses para análise"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna estatísticas de ocupação.
    """
    from datetime import datetime, timedelta
    from app.utils.date_utils import today_local

    booking_service = BookingService(db)

    today = today_local()
    start_date = today - timedelta(days=months * 30)

    # Buscar reservas no período
    bookings = booking_service.get_bookings_in_period(
        property_id,
        start_date,
        today + timedelta(days=30)  # Incluir próximo mês
    )

    # Calcular noites ocupadas por mês
    import calendar

    monthly_data = {}
    for booking in bookings:
        # Determinar meses cobertos pela reserva
        current_date = booking.check_in_date
        while current_date < booking.check_out_date:
            month_key = current_date.strftime("%Y-%m")

            if month_key not in monthly_data:
                # FIX: Calcular número real de dias do mês (não hardcoded 30)
                year, month = map(int, month_key.split('-'))
                days_in_month = calendar.monthrange(year, month)[1]

                monthly_data[month_key] = {
                    "month": month_key,
                    "occupied_nights": 0,
                    "total_nights": days_in_month,  # FIX: Usar dias reais do mês
                    "bookings_count": 0,
                    "airbnb_nights": 0,
                    "booking_nights": 0
                }

            monthly_data[month_key]["occupied_nights"] += 1

            if booking.platform == "airbnb":
                monthly_data[month_key]["airbnb_nights"] += 1
            elif booking.platform == "booking":
                monthly_data[month_key]["booking_nights"] += 1

            current_date += timedelta(days=1)

    # Contar reservas por mês
    for booking in bookings:
        month_key = booking.check_in_date.strftime("%Y-%m")
        if month_key in monthly_data:
            monthly_data[month_key]["bookings_count"] += 1

    # Calcular taxa de ocupação
    for month_data in monthly_data.values():
        month_data["occupancy_rate"] = round(
            (month_data["occupied_nights"] / month_data["total_nights"]) * 100,
            1
        )

    # Ordenar por mês
    sorted_data = sorted(monthly_data.values(), key=lambda x: x["month"])

    return {
        "months": sorted_data,
        "summary": {
            "average_occupancy": round(
                sum(m["occupancy_rate"] for m in sorted_data) / len(sorted_data) if sorted_data else 0,
                1
            ),
            "total_bookings": sum(m["bookings_count"] for m in sorted_data),
            "total_nights": sum(m["occupied_nights"] for m in sorted_data)
        }
    }


@router.get("/revenue")
def get_revenue_stats(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retorna estatísticas de receita (quando disponível).
    """
    from app.utils.date_utils import today_local
    from datetime import timedelta

    booking_service = BookingService(db)

    # Reservas dos últimos 6 meses
    today = today_local()
    start_date = today - timedelta(days=180)

    bookings = booking_service.get_bookings_in_period(
        property_id,
        start_date,
        today + timedelta(days=30)
    )

    # Calcular receita
    total_revenue = sum(
        float(b.total_price) for b in bookings
        if b.total_price and b.status == BookingStatus.CONFIRMED
    )

    # Por plataforma
    airbnb_revenue = sum(
        float(b.total_price) for b in bookings
        if b.total_price and b.platform == "airbnb" and b.status == BookingStatus.CONFIRMED  # FIX: Usar enum
    )

    booking_revenue = sum(
        float(b.total_price) for b in bookings
        if b.total_price and b.platform == "booking" and b.status == BookingStatus.CONFIRMED  # FIX: Usar enum
    )

    # Reservas com preço
    bookings_with_price = [b for b in bookings if b.total_price]

    avg_price = (total_revenue / len(bookings_with_price)) if bookings_with_price else 0

    return {
        "total_revenue": round(total_revenue, 2),
        "average_price_per_booking": round(avg_price, 2),
        "by_platform": {
            "airbnb": round(airbnb_revenue, 2),
            "booking": round(booking_revenue, 2)
        },
        "bookings_with_price": len(bookings_with_price),
        "currency": "BRL",
        "period": "últimos 6 meses"
    }


@router.get("/monthly-report")
def get_monthly_report(
    property_id: int = Query(..., description="ID do imóvel"),
    month: int = Query(..., ge=1, le=12, description="Mês (1-12)"),
    year: int = Query(..., ge=2020, le=2100, description="Ano"),
    send_email: bool = Query(False, description="Enviar relatório por email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Gera relatório mensal com estatísticas financeiras.
    Opcionalmente envia por email ao proprietário.
    """
    stats_service = StatisticsService(db)
    report = stats_service.get_monthly_report(property_id, month, year)

    if send_email:
        try:
            from app.services.email_service import get_email_service as _get_email_svc
            from app.config import settings as app_settings
            from app.models.property import Property
            import asyncio

            property_obj = db.query(Property).filter(Property.id == property_id).first()
            property_name = property_obj.name if property_obj else "Imóvel"

            email_service = _get_email_svc()
            if email_service:
                html_body = stats_service.generate_report_email_body(report, property_name)
                owner_email = app_settings.OWNER_EMAIL

                if owner_email:
                    async def _send():
                        return await email_service.send_email(
                            to=[owner_email],
                            subject=f"Relatório Mensal - {month:02d}/{year} - {property_name}",
                            body=html_body,
                            html=True,
                        )

                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(_send())
                    except RuntimeError:
                        asyncio.run(_send())

                    report["email_sent"] = True
                    report["email_to"] = owner_email
                else:
                    report["email_sent"] = False
                    report["email_error"] = "OWNER_EMAIL não configurado"
            else:
                report["email_sent"] = False
                report["email_error"] = "Serviço de email não configurado"
        except Exception as e:
            logger.error(f"Error sending monthly report email: {e}")
            report["email_sent"] = False
            report["email_error"] = "Erro ao enviar relatório por email."

    return report
