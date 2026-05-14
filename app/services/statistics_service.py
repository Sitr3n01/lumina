# app/services/statistics_service.py
"""
Serviço para geração de relatórios e estatísticas financeiras.
"""

import calendar
from datetime import date, timedelta
from typing import Any

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.utils.logger import get_logger

logger = get_logger(__name__)


class StatisticsService:
    """Serviço de estatísticas e relatórios"""

    def __init__(self, db: Session):
        self.db = db

    def get_monthly_report(self, property_id: int, month: int, year: int) -> dict[str, Any]:
        """
        Gera relatório financeiro de um mês específico.
        Considera reservas que tiveram check-in ou check-out no mês.

        Cálculo simplificado: Soma o valor total de reservas CONFIRMED/COMPLETED
        cujo check-in foi neste mês. (Regime de Caixa simplificado na entrada)
        """
        start_date = date(year, month, 1)
        # Último dia do mês
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)

        # Buscar reservas que iniciaram neste mês
        bookings = (
            self.db.query(Booking)
            .filter(
                and_(
                    Booking.property_id == property_id,
                    Booking.check_in_date >= start_date,
                    Booking.check_in_date <= end_date,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
                )
            )
            .all()
        )

        total_revenue = sum(b.total_price or 0 for b in bookings)
        total_nights = sum(b.nights_count for b in bookings)
        avg_price = total_revenue / len(bookings) if bookings else 0
        avg_nightly = total_revenue / total_nights if total_nights else 0

        # Taxa de ocupação (dias ocupados no mês / dias no mês)
        # Este cálculo é mais complexo pois uma reserva pode começar num mês e terminar no outro
        occupied_days = 0
        day = start_date
        while day <= end_date:
            # Verificar se alguma reserva cobre este dia
            is_occupied = (
                self.db.query(Booking)
                .filter(
                    and_(
                        Booking.property_id == property_id,
                        Booking.check_in_date <= day,
                        Booking.check_out_date > day,  # Check-out day is not occupied night
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
                    )
                )
                .count()
                > 0
            )

            if is_occupied:
                occupied_days += 1
            day += timedelta(days=1)

        occupancy_rate = (occupied_days / last_day) * 100

        return {
            "month": month,
            "year": year,
            "total_bookings": len(bookings),
            "total_revenue": float(total_revenue),
            "total_nights_sold": total_nights,
            "occupancy_rate": round(occupancy_rate, 1),
            "occupied_days": occupied_days,
            "avg_booking_value": round(avg_price, 2),
            "avg_nightly_rate": round(avg_nightly, 2),
            "bookings_list": [
                {
                    "guest": b.guest_name,
                    "check_in": b.check_in_date.strftime("%d/%m"),
                    "check_out": b.check_out_date.strftime("%d/%m"),
                    "value": float(b.total_price or 0),
                    "platform": b.platform,
                }
                for b in bookings
            ],
        }

    def generate_report_email_body(self, report_data: dict[str, Any], property_name: str) -> str:
        """Gera HTML simples para o email de relatório"""

        month_name = calendar.month_name[report_data["month"]]

        rows = ""
        for b in report_data["bookings_list"]:
            rows += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{b["guest"]}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{b["check_in"]} - {b["check_out"]}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{b["platform"]}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ {b["value"]:.2f}</td>
            </tr>
            """

        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">Relatório Mensal - {month_name} {report_data["year"]}</h2>
                    <p style="margin: 5px 0 0;">{property_name}</p>
                </div>

                <div style="padding: 20px; background-color: #f9fafb;">
                    <div style="display: flex; justify-content: space-between; text-align: center;">
                        <div style="flex: 1; padding: 10px; background: white; margin: 0 5px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666;">Faturamento</div>
                            <div style="font-size: 20px; font-weight: bold; color: #10b981;">R$ {report_data["total_revenue"]:.2f}</div>
                        </div>
                        <div style="flex: 1; padding: 10px; background: white; margin: 0 5px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666;">Ocupação</div>
                            <div style="font-size: 20px; font-weight: bold; color: #3b82f6;">{report_data["occupancy_rate"]}%</div>
                        </div>
                        <div style="flex: 1; padding: 10px; background: white; margin: 0 5px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666;">Reservas</div>
                            <div style="font-size: 20px; font-weight: bold; color: #6366f1;">{report_data["total_bookings"]}</div>
                        </div>
                    </div>
                </div>

                <div style="padding: 20px;">
                    <h3 style="border-bottom: 2px solid #4f46e5; padding-bottom: 5px;">Detalhamento</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #f3f4f6;">
                                <th style="padding: 8px; text-align: left;">Hóspede</th>
                                <th style="padding: 8px; text-align: left;">Data</th>
                                <th style="padding: 8px; text-align: left;">Origem</th>
                                <th style="padding: 8px; text-align: right;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows}
                        </tbody>
                    </table>
                </div>

                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                    Gerado automaticamente pelo Lumina
                </div>
            </div>
        </body>
        </html>
        """
