from fastapi.testclient import TestClient

from app.main import app
from app.models.api_record import ApiRecord
from tests.conftest import TestSessionLocal

client = TestClient(app)


def test_create_and_list_survive_new_database_session():
    payload = {"name": "MatrixFlow", "tax_id": "MF-001", "city": "Lima"}
    response = client.post("/api/v1/companies", json=payload)
    assert response.status_code == 201

    with TestSessionLocal() as db:
        stored = db.get(ApiRecord, response.json()["id"])
        assert stored is not None
        assert stored.payload == payload

    listed = client.get("/api/v1/companies")
    assert listed.status_code == 200
    assert listed.json()[0]["name"] == "MatrixFlow"


def test_resource_crud_is_persistent():
    created = client.post(
        "/api/v1/resources/products",
        json={"name": "Monitor", "category": "Pantallas", "price": 120, "stock": 4},
    )
    assert created.status_code == 201
    record_id = created.json()["id"]

    updated = client.put(
        f"/api/v1/resources/products/{record_id}",
        json={"name": "Monitor Pro", "category": "Pantallas", "price": 180, "stock": 3},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Monitor Pro"
    assert client.delete(f"/api/v1/resources/products/{record_id}").status_code == 204
    assert client.get("/api/v1/resources/products").json() == []


def test_report_metrics_are_aggregated_from_persisted_records():
    client.post(
        "/api/v1/resources/sales",
        json={"code": "S-001", "branch": "Centro", "customer": "Cliente A", "amount": 250},
    )
    client.post(
        "/api/v1/resources/inventory",
        json={"product": "Teclado", "branch": "Centro", "quantity": 12},
    )

    response = client.get("/api/v1/reports")

    assert response.status_code == 200
    report = response.json()
    assert report["sales"]["current"] == 250
    assert report["inventory"]["quantity"] == 12
    assert report["sales_by_branch"] == [{"branch": "Centro", "total": 250, "orders": 1}]
    assert len(report["sales_by_month"]) == 12