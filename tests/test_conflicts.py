import pytest

def test_get_conflicts_empty(client, auth_headers):
    response = client.get("/api/conflicts/?property_id=1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    # Verifica se responde corretamente estrutura de listagem (vazia)
    assert isinstance(data, list) or "items" in data
