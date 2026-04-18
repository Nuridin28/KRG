import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** API origin for static files (/storage) and absolute backend URLs. */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1"
  let base = raw.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "")
  if (base.startsWith("http://") || base.startsWith("https://")) return base
  if (typeof window !== "undefined") return window.location.origin
  return "http://localhost:8000"
}

/**
 * Turn backend media paths into a browser-loadable URL.
 * - Relative `/storage/...` → current API host
 * - Rewrites legacy `http://localhost:8000/...` to match configured API origin
 */
export function backendMediaUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return ""
  const s = pathOrUrl.trim()
  if (s.startsWith("data:") || s.startsWith("blob:")) return s
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(s)) {
    try {
      const u = new URL(s)
      return `${getApiOrigin()}${u.pathname}${u.search}`
    } catch {
      /* fall through */
    }
  }
  if (/^https?:\/\//i.test(s)) return s
  const path = s.startsWith("/") ? s : `/${s}`
  return `${getApiOrigin()}${path}`
}

export function formatPrice(price: number, currency?: string): string {
  const cur = (currency || "USD").toUpperCase()
  // If already in KZT or price looks like KZT (> 1000), display directly
  if (cur === "KZT" || price >= 1000) {
    return `${Math.round(price).toLocaleString("ru-KZ")} ₸`
  }
  // Convert USD to KZT for display
  const kzt = Math.round(price * 480)
  return `${kzt.toLocaleString("ru-KZ")} ₸`
}
