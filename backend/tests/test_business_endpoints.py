from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_products_endpoint():
    response = client.post(
        "/api/v1/products",
        json={"name": "Laptop Pro 14", "category": "Computacion", "price": 1249, "stock": 42},
    )

    assert response.status_code == 201
    assert response.json()["status"] == "active"
    assert client.get("/api/v1/products").status_code == 200


def test_sales_endpoint():
    response = client.post(
        "/api/v1/sales",
        json={"code": "MF-9284", "branch": "Lima Centro", "customer": "TecnoRed", "amount": 4280},
    )

    assert response.status_code == 201
    assert response.json()["status"] == "completed"
    assert client.get("/api/v1/sales").status_code == 200


def test_inventory_endpoint():
    response = client.post(
        "/api/v1/inventory",
        json={"product": "Laptop Pro 14", "branch": "Lima Centro", "quantity": 42, "movement": "entry"},
    )

    assert response.status_code == 201
    assert response.json()["status"] == "available"
    assert client.get("/api/v1/inventory").status_code == 200


def test_business_endpoints_validate_values():
    response = client.post(
        "/api/v1/products",
        json={"name": "Monitor", "category": "Pantallas", "price": -1, "stock": 2},
    )

    assert response.status_code == 422


def test_configuration_records_support_persistent_crud():
    created = client.post(
        "/api/v1/resources/configurations",
        json={"name": "Idioma", "value": "es"},
    )
    assert created.status_code == 201
    record_id = created.json()["id"]
    assert client.get("/api/v1/resources/configurations").json() == [
        {"name": "Idioma", "value": "es", "id": record_id}
    ]

    updated = client.put(
        f"/api/v1/resources/configurations/{record_id}",
        json={"name": "Idioma", "value": "en"},
    )
    assert updated.status_code == 200
    assert updated.json()["value"] == "en"
    assert client.delete(f"/api/v1/resources/configurations/{record_id}").status_code == 204
    assert client.get("/api/v1/resources/configurations").json() == []
    audit = client.get("/api/v1/audit")
    assert audit.status_code == 200
    configuration_events = [
        event for event in audit.json()
        if event["module"] == "configurations" and event["entity_id"] == record_id
    ]
    assert {event["action"] for event in configuration_events} == {"create", "update", "delete"}


def test_targets_are_persisted_and_reported():
    from datetime import date

    target = client.post(
        "/api/v1/resources/targets",
        json={
            "name": "Meta mensual",
            "period_start": date.today().isoformat(),
            "period_end": date.today().isoformat(),
            "target_amount": 1000,
            "branch": "Lima Centro",
        },
    )
    assert target.status_code == 201

    sale = client.post(
        "/api/v1/sales",
        json={
            "code": "TEST-REPORT-1",
            "branch": "Lima Centro",
            "customer": "Cliente de prueba",
            "product": "Laptop",
            "quantity": 2,
            "amount": 600,
        },
    )
    assert sale.status_code == 201

    report = client.get("/api/v1/reports").json()
    assert report["sales_by_product"][0]["product"] == "Laptop"
    assert report["sales_by_branch"][0]["orders"] == 1
    assert report["target_progress"][0]["actual"] == 600
    assert report["target_progress"][0]["completion_percent"] == 60


def test_inventory_rotation_uses_net_movements_and_matches_product_names_case_insensitively():
    product = client.post(
        "/api/v1/products",
        json={"name": "Laptop Pro", "category": "Tecnología", "price": 1000, "stock": 99},
    )
    assert product.status_code == 201
    assert client.post(
        "/api/v1/inventory",
        json={"product": "laptop pro", "branch": "Centro", "quantity": 10, "movement": "entry"},
    ).status_code == 201
    assert client.post(
        "/api/v1/inventory",
        json={"product": "Laptop Pro", "branch": "Centro", "quantity": 3, "movement": "exit"},
    ).status_code == 201
    assert client.post(
        "/api/v1/sales",
        json={"code": "ROT-1", "branch": "Centro", "customer": "Cliente", "product": "LAPTOP PRO", "quantity": 14, "amount": 1400},
    ).status_code == 201

    report = client.get("/api/v1/reports").json()
    rotation = report["inventory_rotation"][0]
    assert rotation["stock"] == 7
    assert rotation["sold_quantity"] == 14
    assert rotation["rotation"] == 2
    assert report["inventory"]["quantity"] == 7