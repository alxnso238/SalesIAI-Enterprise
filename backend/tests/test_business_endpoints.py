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
        json={"code": "SA-9284", "branch": "Lima Centro", "customer": "TecnoRed", "amount": 4280},
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


def test_sales_reject_non_finite_amounts():
    response = client.post(
        "/api/v1/sales",
        json={
            "code": "SA-INF",
            "branch": "Lima Centro",
            "customer": "Cliente de prueba",
            "amount": "Infinity",
        },
    )

    assert response.status_code == 422


def test_sale_detail_records_payment_and_reduces_inventory():
    product = client.post(
        "/api/v1/products",
        json={"name": "Mouse USB", "category": "Accesorios", "price": 25, "stock": 10},
    )
    assert product.status_code == 201

    sale = client.post(
        "/api/v1/sales",
        json={
            "code": "SALE-DETAIL-1",
            "branch": "Lima Centro",
            "customer": "Cliente de prueba",
            "amount": 50,
            "items": [{"product": "Mouse USB", "quantity": 2, "unit_price": 25}],
            "payments": [{"payment_method": "card", "amount": 50}],
        },
    )

    assert sale.status_code == 201
    assert sale.json()["items"][0]["quantity"] == 2
    assert sale.json()["payments"][0]["payment_method"] == "card"
    inventory = client.get("/api/v1/inventory")
    assert inventory.status_code == 200
    assert inventory.json()[0]["movement"] == "exit"
    report = client.get("/api/v1/reports").json()
    assert report["inventory_rotation"][0]["stock"] == 8
    assert report["sales_by_product"][0]["quantity"] == 2
    assert report["sales_by_product"][0]["total"] == 50
    insights = client.get("/api/v1/resources/insights")
    assert insights.status_code == 200
    assert insights.json()[0]["source_sale_id"] == sale.json()["id"]
    assert insights.json()[0]["evidence"]["sales_count"] == 1


def test_sale_rejects_detail_or_payment_total_mismatches():
    response = client.post(
        "/api/v1/sales",
        json={
            "code": "SALE-INVALID-1",
            "branch": "Lima Centro",
            "customer": "Cliente de prueba",
            "amount": 50,
            "items": [{"product": "Mouse USB", "quantity": 2, "unit_price": 20}],
            "payments": [{"payment_method": "cash", "amount": 60}],
        },
    )

    assert response.status_code == 422


def test_sale_rejects_quantity_above_available_stock_without_partial_records():
    assert client.post(
        "/api/v1/products",
        json={"name": "Teclado", "category": "Accesorios", "price": 30, "stock": 1},
    ).status_code == 201

    response = client.post(
        "/api/v1/sales",
        json={
            "code": "SALE-OVERSTOCK-1",
            "branch": "Centro",
            "customer": "Cliente",
            "amount": 60,
            "items": [{"product": "Teclado", "quantity": 2, "unit_price": 30}],
        },
    )

    assert response.status_code == 409
    assert client.get("/api/v1/sales").json() == []
    assert client.get("/api/v1/inventory").json() == []


def test_customer_and_employee_resources_validate_and_persist_master_data():
    customer = client.post(
        "/api/v1/resources/customers",
        json={"full_name": "Comercial Andina", "email": "ventas@example.test", "phone": "555-0123"},
    )
    employee = client.post(
        "/api/v1/resources/employees",
        json={"employee_code": "SELL-01", "full_name": "Ana Vendedora", "position": "seller"},
    )

    assert customer.status_code == 201
    assert employee.status_code == 201
    assert client.get("/api/v1/resources/customers").json()[0]["full_name"] == "Comercial Andina"
    assert client.get("/api/v1/resources/employees").json()[0]["employee_code"] == "SELL-01"
    sale = client.post(
        "/api/v1/sales",
        json={"code": "CUSTOMER-HISTORY-1", "branch": "Centro", "customer": "Comercial Andina", "amount": 80},
    )
    history = client.get(f"/api/v1/customers/{customer.json()['id']}/sales")
    assert sale.status_code == 201
    assert history.status_code == 200
    assert [row["code"] for row in history.json()] == ["CUSTOMER-HISTORY-1"]


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
        json={"code": "ROT-1", "branch": "Centro", "customer": "Cliente", "product": "LAPTOP PRO", "quantity": 4, "amount": 400},
    ).status_code == 201

    report = client.get("/api/v1/reports").json()
    rotation = report["inventory_rotation"][0]
    assert rotation["stock"] == 3
    assert rotation["sold_quantity"] == 4
    assert rotation["rotation"] == 1.33
    assert report["inventory"]["quantity"] == 3