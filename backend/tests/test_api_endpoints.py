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


def test_db_integrity_endpoint(client):
    """
    Test the GET /api/settings/db-integrity endpoint.
    """
    response = client.get(f"{API_PREFIX}/settings/db-integrity")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "summary" in data
    assert "checks" in data
    assert data["summary"]["total_checks"] == 17
    assert len(data["checks"]) == 17


def test_db_latency_endpoint(client):
    """
    Test the GET /api/settings/db-latency endpoint.
    """
    # 1. Test normal latency check
    response = client.get(f"{API_PREFIX}/settings/db-latency")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "metrics" in data
    assert "ping_latency_ms" in data["metrics"]
    assert "write_latency_ms" in data["metrics"]
    assert "read_latency_ms" in data["metrics"]
    assert "total_latency_ms" in data["metrics"]
    assert data["threshold_exceeded"] is False

    # 2. Test simulated latency check (delay = 0.05 seconds = 50ms)
    response = client.get(f"{API_PREFIX}/settings/db-latency?simulate_delay=0.05")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["metrics"]["total_latency_ms"] >= 50.0
    assert data["simulated"] is True

def test_db_latency_feedback_endpoint(client):
    """
    Test the POST /api/settings/db-latency/feedback endpoint.
    """
    feedback_payload = {
        "measured_latency_ms": 61200.5,
        "comments": "Testing latency feedback trigger from unit tests",
        "user_email": "test-admin@industrial-analytics.com"
    }
    response = client.post(f"{API_PREFIX}/settings/db-latency/feedback", json=feedback_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "Feedback submitted" in data["message"]


