import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1"

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path
  return `${API_BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return ""
  if (url.startsWith("http")) return url
  if (url.startsWith("/storage")) {
    const apiHost = API_BASE.replace(/\/api\/v1\/?$/, "")
    if (apiHost.startsWith("http")) return `${apiHost}${url}`
    return url
  }
  return url
}
