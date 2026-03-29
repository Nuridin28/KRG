"""Shared fixtures for backend tests.

Integration tests against the running server at localhost:8000.
Start: conda run -n krg python -m uvicorn app.main:app --port 8000
"""

import pytest
import httpx

BASE_URL = "http://localhost:8000"
API = f"{BASE_URL}/api/v1"


@pytest.fixture
def client() -> httpx.Client:
    with httpx.Client(base_url=API, timeout=30.0) as c:
        yield c


@pytest.fixture
def admin_token(client: httpx.Client) -> str:
    resp = client.post("/auth/login", json={
        "email": "admin@krg.com", "password": "admin123",
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture
def user_token(client: httpx.Client) -> str:
    email = "pytest_user@test.com"
    client.post("/auth/register", json={
        "email": email, "password": "test123", "full_name": "Pytest User",
    })
    resp = client.post("/auth/login", json={"email": email, "password": "test123"})
    assert resp.status_code == 200, f"User login failed: {resp.text}"
    return resp.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
