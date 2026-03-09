import pytest
from datetime import datetime, timedelta
from app.models.property import Property
from app.models.guest import Guest

def test_get_bookings_empty(client, auth_headers):
    response = client.get("/api/bookings/?property_id=1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data or isinstance(data, list) or "bookings" in data

def test_create_get_delete_booking(client, auth_headers, db_session):
    # Criar propriedade
    prop = Property(name="Test Prop", address="Test Address")
    db_session.add(prop)
    db_session.commit()

    # Prepara payload
    payload = {
        "property_id": prop.id,
        "guest_name": "John Host",
        "platform": "manual",
        "check_in_date": "2026-12-01",
        "check_out_date": "2026-12-05",
        "status": "confirmed",
        "guest_count": 2,
        "total_price": 500.0,
        "nights_count": 4
    }

    # Criar
    response = client.post("/api/bookings/", json=payload, headers=auth_headers)
    assert response.status_code in [200, 201]
    booking_id = response.json()["id"]

    # Obter
    response = client.get(f"/api/bookings/{booking_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["guest_name"] == "John Host"

    # Atualizar (Put)
    payload["guest_name"] = "Jane Hostess"
    response = client.put(f"/api/bookings/{booking_id}", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["guest_name"] == "Jane Hostess"

    # Deletar
    response = client.delete(f"/api/bookings/{booking_id}", headers=auth_headers)
    assert response.status_code in [200, 204]

    # Obter apos cancelar (a API marca como 'cancelled' ao invés de deletar hard do banco)
    response = client.get(f"/api/bookings/{booking_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
