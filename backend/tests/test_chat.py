"""Chat / stylist endpoint tests."""

import pytest
import httpx



def test_chat_basic(client: httpx.Client):
    resp = client.post("/stylist/chat", json={"message": "привет"})
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert len(data["answer"]) > 0



def test_chat_outfit_request(client: httpx.Client):
    resp = client.post("/stylist/chat", json={
        "message": "подбери мне образ на свидание до 200 долларов",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    # Should return products or outfits
    assert "recommended_products" in data
    assert "recommended_outfits" in data



def test_chat_with_history(client: httpx.Client):
    resp = client.post("/stylist/chat", json={
        "message": "а что-нибудь подешевле?",
        "conversation_history": [
            {"role": "user", "content": "привет"},
            {"role": "assistant", "content": "Привет! Чем могу помочь?"},
        ],
    })
    assert resp.status_code == 200



def test_suggestions(client: httpx.Client):
    resp = client.get("/stylist/suggestions")
    assert resp.status_code == 200
    suggestions = resp.json()
    assert isinstance(suggestions, list)
    assert len(suggestions) > 0
