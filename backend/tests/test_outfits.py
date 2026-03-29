"""Outfit generation endpoint tests."""

import pytest
import httpx



def test_generate_outfits(client: httpx.Client):
    resp = client.post("/outfits/generate", json={
        "style": "casual",
        "occasion": "daily",
        "gender": "female",
        "count": 2,
    })
    assert resp.status_code == 200
    outfits = resp.json()
    assert isinstance(outfits, list)
    if outfits:
        outfit = outfits[0]
        assert "items" in outfit
        assert "compatibility_score" in outfit
        assert "total_price" in outfit
        assert len(outfit["items"]) >= 2



def test_generate_with_budget(client: httpx.Client):
    resp = client.post("/outfits/generate", json={
        "style": "casual",
        "occasion": "daily",
        "gender": "female",
        "budget_max": 200,
        "count": 1,
    })
    assert resp.status_code == 200
    outfits = resp.json()
    if outfits:
        assert outfits[0]["total_price"] <= 200 * 1.05



def test_outfits_by_product(client: httpx.Client):
    # Get a product ID first
    catalog = client.get("/catalog", params={"page_size": "1"})
    items = catalog.json()["items"]
    if not items:
        pytest.skip("No products in catalog")

    resp = client.post("/outfits/by-product", json={
        "product_id": items[0]["id"],
    })
    assert resp.status_code == 200
    outfits = resp.json()
    assert isinstance(outfits, list)



def test_recommend_products(client: httpx.Client):
    catalog = client.get("/catalog", params={"page_size": "1"})
    items = catalog.json()["items"]
    if not items:
        pytest.skip("No products in catalog")

    resp = client.post(f"/outfits/recommend/{items[0]['id']}")
    assert resp.status_code == 200
    recs = resp.json()
    assert isinstance(recs, list)
