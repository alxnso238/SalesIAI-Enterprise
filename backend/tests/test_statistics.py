from fastapi.testclient import TestClient
from datetime import date

from app.main import app


client = TestClient(app)


def test_statistics_calculations_are_persisted_in_history():
    response = client.post("/api/v1/statistics/compare", json={"values": [10, 20, 90]})

    assert response.status_code == 200
    assert response.json()["operation"] == "compare"
    assert response.json()["result"] == {
        "mean": 40,
        "median": 20.0,
        "difference": 20,
        "sample_size": 3,
    }
    history = client.get("/api/v1/statistics/history")
    assert history.status_code == 200
    assert history.json()[0]["id"] == response.json()["id"]


def test_bayes_calculation_validates_evidence_and_computes_posterior():
    response = client.post(
        "/api/v1/statistics/bayes",
        json={
            "probability_a": 0.01,
            "probability_b_given_a": 0.9,
            "probability_b_given_not_a": 0.05,
        },
    )

    assert response.status_code == 200
    assert response.json()["result"]["probability_a_given_b"] == 0.15384615384615385
    assert client.post(
        "/api/v1/statistics/bayes",
        json={
            "probability_a": 0,
            "probability_b_given_a": 0,
            "probability_b_given_not_a": 0,
        },
    ).status_code == 422


def test_analytics_uses_completed_sales_as_statistical_observations():
    for code, amount, status in [
        ("AN-1", 100, "completed"),
        ("AN-2", 300, "completed"),
        ("AN-3", 900, "cancelled"),
    ]:
        created = client.post(
            "/api/v1/sales",
            json={
                "code": code,
                "branch": "Lima Centro",
                "customer": "Cliente Analytics",
                "amount": amount,
                "status": status,
            },
        )
        assert created.status_code == 201

    report = client.get("/api/v1/statistics/analytics")

    assert report.status_code == 200
    assert report.json()["sales_count"] == 2
    assert report.json()["total_revenue"] == 400
    assert report.json()["average_sale"] == 200
    assert report.json()["median_sale"] == 200
    assert report.json()["insights"][0]["evidence"]["sales_count"] == 2


def test_statistics_requires_nonempty_values():
    assert client.post("/api/v1/statistics/mean", json={"values": []}).status_code == 422


def test_random_variable_analysis_returns_descriptive_statistics():
    response = client.post(
        "/api/v1/statistics/random-variables/analyze",
        json={"name": "Unidades por venta", "variable_type": "discreta", "values": [1, 2, 3, 4]},
    )

    assert response.status_code == 200
    assert response.json()["result"] == {
        "name": "Unidades por venta",
        "variable_type": "discreta",
        "observations": 4,
        "mean": 2.5,
        "median": 2.5,
        "minimum": 1,
        "maximum": 4,
    }


def test_analytics_filters_by_date_branch_seller_and_product_category():
    for name, category in [("USB-C Hub", "Accessories"), ("Desk Lamp", "Home")]:
        assert client.post(
            "/api/v1/products",
            json={"name": name, "category": category, "price": 20, "stock": 10},
        ).status_code == 201

    for code, branch, product, amount in [
        ("FILTER-1", "Central", "USB-C Hub", 40),
        ("FILTER-2", "North", "Desk Lamp", 20),
    ]:
        assert client.post(
            "/api/v1/sales",
            json={
                "code": code,
                "branch": branch,
                "customer": "Cliente",
                "amount": amount,
                "items": [{"product": product, "quantity": 2, "unit_price": amount / 2}],
            },
        ).status_code == 201

    params = {
        "date_from": date.today().isoformat(),
        "date_to": date.today().isoformat(),
        "branch": "Central",
        "seller": "admin-test@example.test",
        "category": "Accessories",
    }
    report = client.get("/api/v1/statistics/analytics", params=params)

    assert report.status_code == 200
    assert report.json()["sales_count"] == 1
    assert report.json()["total_revenue"] == 40
    assert report.json()["filter_options"]["categories"] == ["Accessories", "Home"]


def test_dataset_variable_analysis_uses_persisted_observations():
    dataset = client.post(
        "/api/v1/resources/datasets",
        json={"name": "Ventas de prueba", "source_type": "sales"},
    )
    assert dataset.status_code == 201
    variable = client.post(
        "/api/v1/resources/dataset_variables",
        json={
            "dataset_id": dataset.json()["id"],
            "name": "amount",
            "label": "Importe",
            "variable_type": "continua",
            "measurement_scale": "ratio",
        },
    )
    assert variable.status_code == 201
    for value in (10, 20, 30):
        observation = client.post(
            "/api/v1/resources/observations",
            json={"variable_id": variable.json()["id"], "value": value},
        )
        assert observation.status_code == 201

    result = client.post(
        f"/api/v1/statistics/datasets/{dataset.json()['id']}/variables/{variable.json()['id']}/analyze",
        json={"operation": "compare"},
    )

    assert result.status_code == 200
    assert result.json()["result"] == {
        "mean": 20,
        "median": 20,
        "difference": 0,
        "sample_size": 3,
    }