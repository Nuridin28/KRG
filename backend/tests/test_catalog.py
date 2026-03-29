"""Catalog endpoint tests."""

import pytest
import httpx



def test_catalog_list(client: httpx.Client):
    resp = client.get("/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["total"] >= 0



def test_catalog_pagination(client: httpx.Client):
    resp = client.get("/catalog", params={"page": "1", "page_size": "5"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 5
    assert data["page"] == 1



def test_catalog_filter_category(client: httpx.Client):
    resp = client.get("/catalog", params={"category": "shoes"})
    assert resp.status_code == 200
    for item in resp.json()["items"]:
        assert item["category"] == "shoes"



def test_catalog_filter_brand(client: httpx.Client):
    # Get available brands first
    brands_resp = client.get("/catalog/brands")
    brands = brands_resp.json()
    if brands:
        resp = client.get("/catalog", params={"brand": brands[0]})
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["brand"] == brands[0]



def test_catalog_search(client: httpx.Client):
    resp = client.get("/catalog", params={"search": "shirt"})
    assert resp.status_code == 200



def test_catalog_get_product(client: httpx.Client):
    # Get first product from catalog
    resp = client.get("/catalog", params={"page_size": "1"})
    items = resp.json()["items"]
    if items:
        pid = items[0]["id"]
        resp = client.get(f"/catalog/{pid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == pid



def test_catalog_product_not_found(client: httpx.Client):
    resp = client.get("/catalog/nonexistent-product-id")
    assert resp.status_code == 404



def test_catalog_brands(client: httpx.Client):
    resp = client.get("/catalog/brands")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)



def test_catalog_colors(client: httpx.Client):
    resp = client.get("/catalog/colors")
    assert resp.status_code == 200



def test_catalog_styles(client: httpx.Client):
    resp = client.get("/catalog/styles")
    assert resp.status_code == 200



def test_catalog_occasions(client: httpx.Client):
    resp = client.get("/catalog/occasions")
    assert resp.status_code == 200
