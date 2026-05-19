from app.core.config import API_PREFIX

def test_root_endpoint(client):
    """
    Test the API root endpoint.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "Backend is running successfully" in response.json()["message"]

def test_healthz_endpoint(client):
    """
    Test the /healthz endpoint.
    """
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_columns_suggest_endpoint(client):
    """
    Test the GET /api/projects/columns/suggest endpoint.
    This endpoint is database-independent and auth-independent.
    """
    response = client.get(f"{API_PREFIX}/projects/columns/suggest?name=budget_amount")
    assert response.status_code == 200
    assert response.json() == {"suggested_type": "currency"}
    
    response = client.get(f"{API_PREFIX}/projects/columns/suggest?name=user_email")
    assert response.status_code == 200
    assert response.json() == {"suggested_type": "email"}
