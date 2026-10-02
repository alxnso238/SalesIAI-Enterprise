from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.security import get_current_user
from app.main import app
from app.core.security import hash_password
from app.models.security import Role, User
from tests.conftest import TestSessionLocal, test_admin_user

client = TestClient(app)


def test_data_routes_require_authentication():
    app.dependency_overrides.pop(get_current_user, None)
    try:
        response = client.get("/api/v1/resources/products")
        assert response.status_code == 401
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user


def test_viewer_can_read_reports_and_master_data_but_not_operate():
    with TestSessionLocal() as db:
        role = Role(name="viewer")
        db.add(role)
        db.flush()
        viewer = User(
            role_id=role.id,
            full_name="Report Viewer",
            email="report-viewer@example.test",
            password_hash=hash_password("viewer-password-123"),
        )
        db.add(viewer)
        db.commit()
        viewer = db.scalar(select(User).options(joinedload(User.role)).where(User.id == viewer.id))

    app.dependency_overrides[get_current_user] = lambda: viewer
    try:
        assert client.get("/api/v1/reports").status_code == 200
        assert client.get("/api/v1/resources/products").status_code == 200
        assert client.post(
            "/api/v1/resources/products",
            json={"name": "Producto", "category": "General", "price": 10, "stock": 1},
        ).status_code == 403
        assert client.get("/api/v1/resources/vectors").status_code == 403
        assert client.get("/api/v1/audit").status_code == 403
        assert client.post(
            "/api/v1/operations",
            json={"operation": "dot_product", "data": [1, 2], "other": [3, 4]},
        ).status_code == 403
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user
    assert client.get("/api/v1/audit").status_code == 200


def test_member_can_execute_operations_but_cannot_manage_users():
    with TestSessionLocal() as db:
        role = Role(name="member")
        db.add(role)
        db.flush()
        member = User(
            role_id=role.id,
            full_name="Analyst Member",
            email="analyst-member@example.test",
            password_hash=hash_password("member-password-123"),
        )
        db.add(member)
        db.commit()
        member = db.scalar(select(User).options(joinedload(User.role)).where(User.id == member.id))

    app.dependency_overrides[get_current_user] = lambda: member
    try:
        operation = client.post(
            "/api/v1/operations",
            json={"operation": "dot_product", "data": [1, 2], "other": [3, 4]},
        )
        assert operation.status_code == 200
        assert client.get("/api/v1/users").status_code == 403
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user


def test_member_can_operate_sales_inventory_and_math_but_not_manage_master_data():
    with TestSessionLocal() as db:
        role = Role(name="member")
        db.add(role)
        db.flush()
        member = User(
            role_id=role.id,
            full_name="Business Member",
            email="business-member@example.test",
            password_hash=hash_password("member-password-123"),
        )
        db.add(member)
        db.commit()
        member = db.scalar(select(User).options(joinedload(User.role)).where(User.id == member.id))

    app.dependency_overrides[get_current_user] = lambda: member
    try:
        assert client.post(
            "/api/v1/sales",
            json={"code": "MEMBER-1", "branch": "Centro", "customer": "Cliente", "amount": 50},
        ).status_code == 201
        assert client.post(
            "/api/v1/inventory",
            json={"product": "Producto", "branch": "Centro", "quantity": 5, "movement": "entry"},
        ).status_code == 201
        assert client.get("/api/v1/resources/products").status_code == 200
        assert client.post(
            "/api/v1/resources/products",
            json={"name": "Producto", "category": "General", "price": 10, "stock": 1},
        ).status_code == 403
        assert client.put("/api/v1/resources/vectors/1", json={}).status_code == 403
        assert client.delete("/api/v1/resources/vectors/1").status_code == 403
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user


def test_analyst_can_analyze_but_cannot_operate_sales_or_inventory():
    with TestSessionLocal() as db:
        role = Role(name="analyst")
        db.add(role)
        db.flush()
        analyst = User(
            role_id=role.id,
            full_name="Math Analyst",
            email="math-analyst@example.test",
            password_hash=hash_password("analyst-password-123"),
        )
        db.add(analyst)
        db.commit()
        analyst = db.scalar(select(User).options(joinedload(User.role)).where(User.id == analyst.id))

    app.dependency_overrides[get_current_user] = lambda: analyst
    try:
        assert client.get("/api/v1/reports").status_code == 200
        assert client.get("/api/v1/resources/products").status_code == 200
        assert client.get("/api/v1/sales").status_code == 403
        assert client.get("/api/v1/inventory").status_code == 403
        assert client.post(
            "/api/v1/operations",
            json={"operation": "dot_product", "data": [1, 2], "other": [3, 4]},
        ).status_code == 200
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user