from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.security import get_current_user, hash_password, verify_password
from app.main import app
from app.models.security import Role, User
from tests.conftest import TestSessionLocal, test_admin_user

client = TestClient(app)


def test_user_listing_never_returns_password_hash():
    with TestSessionLocal() as db:
        role = Role(name="viewer")
        db.add(role)
        db.flush()
        db.add(User(
            role_id=role.id,
            full_name="Read Only User",
            email="viewer@example.test",
            password_hash="secret-hash-value",
        ))
        db.commit()

    response = client.get("/api/v1/users")
    assert response.status_code == 200
    assert response.json()[0]["email"] == "viewer@example.test"
    assert "password_hash" not in response.json()[0]


def test_admin_can_create_and_reset_user_password():
    with TestSessionLocal() as db:
        role = Role(name="admin")
        db.add(role)
        db.flush()
        admin = User(
            role_id=role.id,
            full_name="Admin Test",
            email="admin-crud@example.test",
            password_hash=hash_password("admin-password-123"),
        )
        db.add(admin)
        db.commit()
        admin = db.scalar(select(User).options(joinedload(User.role)).where(User.id == admin.id))

    app.dependency_overrides[get_current_user] = lambda: admin
    try:
        created = client.post(
            "/api/v1/users",
            json={
                "full_name": "Managed User",
                "email": "managed@example.test",
                "password": "initial-password-123",
                "role": "analyst",
            },
        )
        assert created.status_code == 201
        assert created.json()["role"] == "analyst"
        assert "password_hash" not in created.json()

        default_role_user = client.post(
            "/api/v1/users",
            json={
                "full_name": "Default Viewer",
                "email": "default-viewer@example.test",
                "password": "initial-password-456",
            },
        )
        assert default_role_user.status_code == 201
        assert default_role_user.json()["role"] == "viewer"

        user_id = created.json()["id"]
        identity_updated = client.patch(
            f"/api/v1/users/{user_id}",
            json={"full_name": "  Updated   Name ", "email": "UPDATED@example.test"},
        )
        assert identity_updated.status_code == 200
        assert identity_updated.json()["name"] == "Updated Name"
        assert identity_updated.json()["email"] == "updated@example.test"
        duplicate_email = client.patch(
            f"/api/v1/users/{user_id}",
            json={"email": "admin-crud@example.test"},
        )
        assert duplicate_email.status_code == 409
        updated = client.patch(
            f"/api/v1/users/{user_id}",
            json={"password": "new-password-456", "is_active": True},
        )
        assert updated.status_code == 200
        with TestSessionLocal() as db:
            user = db.get(User, user_id)
            assert user is not None
            assert verify_password("new-password-456", user.password_hash)

        cannot_disable_self = client.patch(
            f"/api/v1/users/{admin.id}", json={"is_active": False}
        )
        assert cannot_disable_self.status_code == 409
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user


def test_member_cannot_manage_users():
    with TestSessionLocal() as db:
        role = Role(name="member")
        db.add(role)
        db.flush()
        member = User(
            role_id=role.id,
            full_name="Member Test",
            email="member-crud@example.test",
            password_hash=hash_password("member-password-123"),
        )
        db.add(member)
        db.commit()
        member = db.scalar(select(User).options(joinedload(User.role)).where(User.id == member.id))

    app.dependency_overrides[get_current_user] = lambda: member
    try:
        response = client.post(
            "/api/v1/users",
            json={
                "full_name": "Unauthorized User",
                "email": "unauthorized@example.test",
                "password": "long-enough-password-123",
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user