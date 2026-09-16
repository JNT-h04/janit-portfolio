from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_online():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "online"
    assert body["uptime_seconds"] >= 0
