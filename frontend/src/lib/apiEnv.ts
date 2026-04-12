/** Single place for Vite API env defaults (local dev). Production: set VITE_API_BASE on the host. */

const DEFAULT_API_ORIGIN = "http://localhost:8000"
const DEFAULT_API_BASE = `${DEFAULT_API_ORIGIN}/api/v1`

/** Full API prefix including `/api/v1`. Trailing slashes stripped to avoid `//catalog` URLs. */
export function getViteApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE
  return raw.replace(/\/+$/, "")
}

/** Public origin of the backend (no `/api/v1`) — for `/storage/...` and absolute image URLs. */
export function getApiOrigin(): string {
  const base = getViteApiBase().replace(/\/api\/v1\/?$/, "")
  return base || DEFAULT_API_ORIGIN
}

/**
 * Use for any `<img src>` that may be a backend path (`/storage/...`).
 * A bare `/path` resolves against the Vite origin in dev and 404s; prefix with API origin instead.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (url == null || url === "") return undefined
  const u = url.trim()
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:") ||
    u.startsWith("blob:")
  ) {
    return u
  }
  if (u.startsWith("//")) {
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "https:" : "http:"
    return `${proto}${u}`
  }
  if (u.startsWith("/")) {
    return `${getApiOrigin()}${u}`
  }
  return u
}
