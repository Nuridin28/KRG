"""Auth endpoint tests."""

import pytest
import httpx
from tests.conftest import auth



def test_register_and_login(client: httpx.Client):
    import uuid
    email = f"test_{uuid.uuid4().hex[:6]}@test.com"

    # Register
    resp = client.post("/auth/register", json={
        "email": email, "password": "pass123", "full_name": "New User",
    })
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["email"] == email
    assert data["role"] == "user"

    # Login
    resp = client.post("/auth/login", json={
        "email": email, "password": "pass123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()



def test_register_duplicate(client: httpx.Client):
    import uuid
    email = f"dup_{uuid.uuid4().hex[:6]}@test.com"
    client.post("/auth/register", json={"email": email, "password": "p"})
    resp = client.post("/auth/register", json={"email": email, "password": "p"})
    assert resp.status_code == 400



def test_login_wrong_password(client: httpx.Client):
    import uuid
    email = f"wrong_{uuid.uuid4().hex[:6]}@test.com"
    client.post("/auth/register", json={"email": email, "password": "correct"})
    resp = client.post("/auth/login", json={"email": email, "password": "wrong"})
    assert resp.status_code == 401



def test_me(client: httpx.Client, admin_token: str):
    resp = client.get("/auth/me", headers=auth(admin_token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "admin@krg.com"



def test_me_no_token(client: httpx.Client):
    resp = client.get("/auth/me")
    assert resp.status_code in (401, 403)
