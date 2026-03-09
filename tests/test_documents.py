import pytest

def test_list_documents_empty(client, auth_headers):
    response = client.get("/api/v1/documents/list", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list) or "items" in data or "documents" in data

def test_generate_document_invalid_booking(client, auth_headers):
    # Tenta gerar documento de uma reserva inexistente
    response = client.post("/api/v1/documents/generate-from-booking", json={"booking_id": 9999}, headers=auth_headers)
    assert response.status_code == 404

def test_download_document_invalid(client, auth_headers):
    # Proteger contra dir traversal e arquivos nao encontrados
    response = client.get("/api/v1/documents/download/non-existent.docx", headers=auth_headers)
    assert response.status_code in [404, 400]
