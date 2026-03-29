"""Profile, wardrobe, daily outfit, admin tests."""

import io
import pytest
import httpx
from tests.conftest import auth


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------


def test_get_preferences(client: httpx.Client, user_token: str):
    resp = client.get("/profile/preferences", headers=auth(user_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "preferred_styles" in data



def test_update_preferences(client: httpx.Client, user_token: str):
    resp = client.put("/profile/preferences",
        headers=auth(user_token),
        json={"preferred_styles": ["office"], "city": "Moscow"},
    )
    assert resp.status_code == 200
    assert resp.json()["city"] == "Moscow"


# ---------------------------------------------------------------------------
# Photos
# ---------------------------------------------------------------------------


def test_upload_and_list_photos(client: httpx.Client, user_token: str):
    fake_image = b"\xff\xd8\xff\xe0" + b"\x00" * 2000
    resp = client.post("/profile/photos",
        headers=auth(user_token),
        files={"photo": ("test.jpg", io.BytesIO(fake_image), "image/jpeg")},
    )
    assert resp.status_code == 200
    photo = resp.json()
    assert "image_url" in photo

    # List
    resp = client.get("/profile/photos", headers=auth(user_token))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ---------------------------------------------------------------------------
# Wardrobe
# ---------------------------------------------------------------------------


def test_wardrobe_crud(client: httpx.Client, user_token: str):
    # Add
    resp = client.post("/wardrobe/items",
        headers=auth(user_token),
        json={"category": "tops", "name": "My T-Shirt", "color_name": "White", "color_hex": "#FFF"},
    )
    assert resp.status_code == 200
    item_id = resp.json()["id"]

    # List
    resp = client.get("/wardrobe/items", headers=auth(user_token))
    assert resp.status_code == 200
    assert any(i["id"] == item_id for i in resp.json())

    # Delete
    resp = client.delete(f"/wardrobe/items/{item_id}", headers=auth(user_token))
    assert resp.status_code == 200



def test_wardrobe_analyze(client: httpx.Client, user_token: str):
    # Add a few items
    for item in [
        {"category": "tops", "name": "White Tee", "color_hex": "#FFF"},
        {"category": "bottoms", "name": "Blue Jeans", "color_hex": "#3A5BA0"},
        {"category": "shoes", "name": "Sneakers", "color_hex": "#000"},
    ]:
        client.post("/wardrobe/items", headers=auth(user_token), json=item)

    resp = client.post("/wardrobe/analyze", headers=auth(user_token), timeout=60.0)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_items" in data
    assert "analysis_text" in data
    assert "possible_outfits" in data
    assert "gap_recommendations" in data


# ---------------------------------------------------------------------------
# Daily outfit
# ---------------------------------------------------------------------------


def test_daily_outfit_no_auth(client: httpx.Client):
    resp = client.get("/daily-outfit")
    assert resp.status_code in (401, 403)



def test_daily_outfit_with_auth(client: httpx.Client, user_token: str):
    # Set preferences first
    client.put("/profile/preferences",
        headers=auth(user_token),
        json={"preferred_styles": ["casual"], "preferred_gender": "male", "city": "Almaty"},
    )
    resp = client.get("/daily-outfit", headers=auth(user_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "outfit" in data
    assert "date" in data


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


def test_admin_stats(client: httpx.Client, admin_token: str):
    resp = client.get("/admin/stats", headers=auth(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "total_products" in data
    assert "total_users" in data



def test_admin_stats_forbidden(client: httpx.Client, user_token: str):
    resp = client.get("/admin/stats", headers=auth(user_token))
    assert resp.status_code == 403



def test_admin_feature_flags(client: httpx.Client, admin_token: str):
    resp = client.get("/admin/feature-flags", headers=auth(admin_token))
    assert resp.status_code == 200
    flags = resp.json()
    assert isinstance(flags, dict)



def test_admin_upload_image(client: httpx.Client, admin_token: str):
    fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 2000
    resp = client.post("/admin/upload-image",
        headers=auth(admin_token),
        files={"image": ("test.png", io.BytesIO(fake_image), "image/png")},
    )
    assert resp.status_code == 200
    assert "image_url" in resp.json()
