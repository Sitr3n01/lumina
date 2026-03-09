"""
Schemas Pydantic para Booking (DTOs para API).
"""
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class BookingBase(BaseModel):
    """Schema base de Booking"""
    guest_name: str = Field(..., min_length=1, max_length=200)
    check_in_date: date
    check_out_date: date
    nights_count: int = Field(..., gt=0)
    guest_count: int = Field(default=1, ge=1)
    platform: str = Field(..., pattern="^(airbnb|booking|manual)$")
    status: str = Field(default="confirmed")
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    total_price: Optional[Decimal] = None
    currency: str = Field(default="BRL")

    @field_validator('check_out_date')
    @classmethod
    def validate_checkout_after_checkin(cls, v, info):
        """Valida que check-out é após check-in"""
        if 'check_in_date' in info.data:
            if v <= info.data['check_in_date']:
                raise ValueError('Data de check-out deve ser posterior à data de check-in')
        return v

    @field_validator('nights_count')
    @classmethod
    def validate_nights_count(cls, v, info):
        """Valida que nights_count corresponde às datas"""
        if 'check_in_date' in info.data and 'check_out_date' in info.data:
            expected_nights = (info.data['check_out_date'] - info.data['check_in_date']).days
            if v != expected_nights:
                raise ValueError(f'Número de noites ({v}) não corresponde às datas ({expected_nights} noites)')
        return v


class BookingCreate(BookingBase):
    """Schema para criar Booking"""
    property_id: int
    calendar_source_id: Optional[int] = None


class BookingUpdate(BaseModel):
    """Schema para atualizar Booking"""
    guest_name: Optional[str] = None
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    guest_count: Optional[int] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    total_price: Optional[Decimal] = None
    status: Optional[str] = None


from datetime import date, datetime

class BookingResponse(BookingBase):
    """Schema de resposta de Booking"""
    id: int
    property_id: int
    calendar_source_id: Optional[int]
    guest_id: Optional[int]
    external_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookingListResponse(BaseModel):
    """Schema de resposta de lista de Bookings"""
    bookings: list[BookingResponse]
    total: int
    page: int
    page_size: int
