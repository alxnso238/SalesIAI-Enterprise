from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_current_user, hash_password
from app.main import app
from app.models.security import Role, User
from tests.conftest import TestSessionLocal, test_admin_user

client = TestClient(app)


def test_login_checks_persisted_user_and_password():
    old_secret = settings.jwt_secret_key
    settings.jwt_secret_key = "local-test-signing-key-at-least-32-chars"
    try:
        with TestSessionLocal() as db:
            role = Role(name="admin")
            db.add(role)
            db.flush()
            db.add(User(
                role_id=role.id,
                full_name="Admin Test",
                email="admin@example.test",
                password_hash=hash_password("correct-password-123"),
            ))
            db.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.test", "password": "correct-password-123"},
        )
        assert response.status_code == 200
        assert response.json()["user"]["name"] == "Admin Test"
        assert response.json()["access_token"]

        app.dependency_overrides.pop(get_current_user, None)
        protected = client.get(
            "/api/v1/resources/products",
            headers={"Authorization": f"Bearer {response.json()['access_token']}"},
        )
        assert protected.status_code == 200
        profile = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {response.json()['access_token']}"},
        )
        assert profile.status_code == 200
        assert profile.json()["role"] == "admin"
    finally:
        app.dependency_overrides[get_current_user] = lambda: test_admin_user
        settings.jwt_secret_key = old_secret


def test_register_creates_viewer_and_allows_login():
    old_secret = settings.jwt_secret_key
    settings.jwt_secret_key = "local-test-signing-key-at-least-32-chars"
    try:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "  New   Member  ",
                "email": "NEW.MEMBER@example.test",
                "password": "correct-password-123",
            },
        )
        assert response.status_code == 201
        assert response.json()["user"] == {
            "email": "new.member@example.test",
            "name": "New Member",
            "role": "viewer",
        }

        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "new.member@example.test", "password": "correct-password-123"},
        )
        assert login_response.status_code == 200
        assert login_response.json()["user"]["name"] == "New Member"
    finally:
        settings.jwt_secret_key = old_secret


def test_login_normalizes_email_like_registration():
    old_secret = settings.jwt_secret_key
    settings.jwt_secret_key = "local-test-signing-key-at-least-32-chars"
    try:
        registered = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Case Test",
                "email": "case.test@example.test",
                "password": "correct-password-123",
            },
        )
        assert registered.status_code == 201

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "  CASE.TEST@EXAMPLE.TEST  ", "password": "correct-password-123"},
        )
        assert response.status_code == 200
    finally:
        settings.jwt_secret_key = old_secret


def test_register_rejects_duplicate_email_and_short_password():
    old_secret = settings.jwt_secret_key
    settings.jwt_secret_key = "local-test-signing-key-at-least-32-chars"
    try:
        payload = {
            "full_name": "First Member",
            "email": "member@example.test",
            "password": "correct-password-123",
        }
        assert client.post("/api/v1/auth/register", json=payload).status_code == 201
        duplicate = {**payload, "email": "MEMBER@example.test"}
        assert client.post("/api/v1/auth/register", json=duplicate).status_code == 409
        invalid = {**payload, "email": "short@example.test", "password": "tiny"}
        assert client.post("/api/v1/auth/register", json=invalid).status_code == 422
    finally:
        settings.jwt_secret_key = old_secret