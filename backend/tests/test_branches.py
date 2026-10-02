from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_create_and_list_branches():
    payload = {
        "name": "Lima Centro",
        "city": "Lima",
        "manager": "Ana Torres",
        "code": "LIM-01",
    }

    create_response = client.post("/api/v1/branches", json=payload)

    assert create_response.status_code == 201
    assert create_response.json()["name"] == payload["name"]
    assert create_response.json()["status"] == "active"

    list_response = client.get("/api/v1/branches")

    assert list_response.status_code == 200
    assert any(branch["code"] == payload["code"] for branch in list_response.json())


def test_create_branch_rejects_short_manager():
    response = client.post(
        "/api/v1/branches",
        json={"name": "Lima Centro", "city": "Lima", "manager": "A"},
    )

    assert response.status_code == 422