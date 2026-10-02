from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_create_and_list_companies():
    payload = {"name": "Acme Corp", "tax_id": "ACME-001", "city": "Madrid"}

    create_response = client.post("/api/v1/companies", json=payload)

    assert create_response.status_code == 201
    assert create_response.json() | payload == create_response.json()

    list_response = client.get("/api/v1/companies")

    assert list_response.status_code == 200
    assert any(company["name"] == payload["name"] for company in list_response.json())


def test_create_company_rejects_short_name():
    response = client.post(
        "/api/v1/companies",
        json={"name": "A", "tax_id": "ACME-002", "city": "Madrid"},
    )

    assert response.status_code == 422