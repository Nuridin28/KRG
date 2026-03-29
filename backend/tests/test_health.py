"""Health and basic endpoint tests."""

import pytest
import httpx



def test_health(client: httpx.Client):
    resp = client.get("http://localhost:8000/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"



def test_openapi(client: httpx.Client):
    resp = client.get("http://localhost:8000/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    assert "/api/v1/catalog" in paths
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/tryon/jobs" in paths
    assert "/api/v1/video/generate" in paths
    assert "/api/v1/wardrobe/items" in paths
    assert "/api/v1/daily-outfit" in paths
    assert "/api/v1/profile/photos" in paths



def test_video_generate(client: httpx.Client):
    resp = client.post("/video/generate", json={
        "source_image_url": "http://example.com/test.png",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data
    assert data["status"] == "queued"



def test_video_job_not_found(client: httpx.Client):
    resp = client.get("/video/jobs/nonexistent")
    assert resp.status_code == 404
