from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_operation_endpoint():
    response = client.post("/api/v1/operations", json={"operation": "dot_product", "data": [1, 2], "other": [3, 4]})
    assert response.status_code == 200
    assert response.json()["result"] == 11.0
    history = client.get("/api/v1/resources/operations")
    assert history.status_code == 200
    assert history.json()[0]["result"] == 11.0
