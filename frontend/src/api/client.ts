import { useAuth } from "@/store/auth"
import type {
  AdminStats,
  AuthUser,
  CatalogResponse,
  ChatMessage,
  ChatResponse,
  Outfit,
  OutfitGenerateRequest,
  Product,
  ProductBrief,
  TokenResponse,
  TryOnJob,
} from "./types"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1"

// ---------------------------------------------------------------------------
// Simple in-memory cache with TTL
// ---------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL = 60_000 // 1 minute

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl })
}

// ---------------------------------------------------------------------------
// Auth header helper
// ---------------------------------------------------------------------------
function authHeaders(): Record<string, string> {
  const token = useAuth.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---------------------------------------------------------------------------
// HTTP request wrapper
// ---------------------------------------------------------------------------
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      useAuth.getState().logout()
    }
    const error = await res.json().catch(() => ({ detail: "Ошибка сервера" }))
    throw new Error(error.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

async function cachedRequest<T>(path: string, ttl?: number): Promise<T> {
  const cached = getCached<T>(path)
  if (cached) return cached
  const data = await request<T>(path)
  setCache(path, data, ttl)
  return data
}

// ---------------------------------------------------------------------------
// Prefetch helper
// ---------------------------------------------------------------------------
export function prefetch(path: string, ttl?: number): void {
  if (getCached(path)) return
  request(path)
    .then((data) => setCache(path, data, ttl))
    .catch(() => {})
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------
export const api = {
  auth: {
    register: (data: { email: string; password: string; full_name?: string }) =>
      request<AuthUser>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request<AuthUser>("/auth/me"),
  },

  catalog: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? "?" + new URLSearchParams(params).toString() : ""
      return cachedRequest<CatalogResponse>(`/catalog${query}`, 120_000)
    },
    getProduct: (id: string) => cachedRequest<Product>(`/catalog/${id}`, 120_000),
    getBrands: () => cachedRequest<string[]>("/catalog/brands", 300_000),
    getColors: () => cachedRequest<string[]>("/catalog/colors", 300_000),
    getStyles: () => cachedRequest<{ styles: string[] }>("/catalog/styles", 300_000),
    getOccasions: () => cachedRequest<{ occasions: string[] }>("/catalog/occasions", 300_000),
  },

  outfits: {
    generate: (data: OutfitGenerateRequest) =>
      request<Outfit[]>("/outfits/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    byProduct: (data: { product_id: string; occasion?: string; budget_max?: number }) =>
      request<Outfit[]>("/outfits/by-product", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    recommend: (productId: string) =>
      request<ProductBrief[]>(`/outfits/recommend/${productId}`, { method: "POST" }),
  },

  tryon: {
    createJob: async (personImage: File, productId: string) => {
      const formData = new FormData()
      formData.append("person_image", personImage)
      formData.append("product_id", productId)
      return request<TryOnJob>("/tryon/jobs", {
        method: "POST",
        body: formData,
      })
    },
    createOutfitJob: async (personImage: File, productIds: string[]) => {
      const formData = new FormData()
      formData.append("person_image", personImage)
      formData.append("product_ids", productIds.join(","))
      return request<TryOnJob>("/tryon/outfit-jobs", {
        method: "POST",
        body: formData,
      })
    },
    getJob: (jobId: string) => request<TryOnJob>(`/tryon/jobs/${jobId}`),
  },

  chat: {
    send: (data: { message: string; conversation_history?: ChatMessage[] }) =>
      request<ChatResponse>("/stylist/chat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  savedOutfits: {
    save: (data: any) =>
      request<any>("/outfits/save", { method: "POST", body: JSON.stringify(data) }),
    history: (limit = 20) => request<any[]>(`/outfits/history?limit=${limit}`),
    delete: (id: string) => request<any>(`/outfits/history/${id}`, { method: "DELETE" }),
    getShared: (id: string) => request<any>(`/outfits/shared/${id}`),
  },

  admin: {
    getStats: () => request<AdminStats>("/admin/stats"),
    getProducts: (page = 1, pageSize = 50) =>
      request<Product[]>(`/admin/products?page=${page}&page_size=${pageSize}`),
    createProduct: (data: Partial<Product>) =>
      request<Product>("/admin/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateProduct: (id: string, data: Partial<Product>) =>
      request<Product>(`/admin/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteProduct: (id: string) =>
      request<{ deleted: string }>(`/admin/products/${id}`, { method: "DELETE" }),
    getUsers: () => request<AuthUser[]>("/admin/users"),
    getFeatureFlags: () => request<Record<string, boolean>>("/admin/feature-flags"),
    updateFeatureFlags: (flags: Record<string, boolean>) =>
      request<Record<string, boolean>>("/admin/feature-flags", {
        method: "POST",
        body: JSON.stringify(flags),
      }),
  },
}
