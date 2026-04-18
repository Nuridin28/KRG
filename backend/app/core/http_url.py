"""Resolve relative paths to absolute URLs for httpx (requires http(s) scheme)."""

from app.core.config import settings


def absolute_http_url(url: str) -> str:
    """
    Catalog and storage often expose paths like /storage/images/... .
    httpx.AsyncClient.get() needs an absolute URL with scheme.
    """
    u = (url or "").strip()
    if not u:
        return u
    if u.startswith(("http://", "https://")):
        return u
    if u.startswith("//"):
        return f"https:{u}"
    if u.startswith("/"):
        base = (settings.PUBLIC_BASE_URL or "").rstrip("/") or "http://localhost:8000"
        return f"{base}{u}"
    return u
