import { apiUrl, resolveImageUrl } from "./utils"

export type TryOnStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "succeeded"

export interface TryOnJob {
  job_id: string
  status: TryOnStatus
  progress: number
  output_image_url?: string | null
  garment_image_url?: string | null
  failure_reason?: string | null
  provider_used?: string | null
  current_step?: string | null
}

export type GarmentCategory =
  | "tops"
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "shoes"
  | "accessories"

export interface WardrobeItem {
  id: number
  image_url: string
  name: string
  category: GarmentCategory
  created_at: string
}

export interface OutfitItem {
  id: number
  image_url: string
  name: string
  category: GarmentCategory
}

export interface Outfit {
  id: string
  name: string
  items: OutfitItem[]
  created_at: string
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QuotaExceededError"
  }
}

interface AuthHeaders {
  token?: string | null
}

function authHeaders({ token }: AuthHeaders = {}): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function startAnonymousTryOn(
  personFile: File,
  garmentFile: File,
  opts: AuthHeaders = {},
): Promise<TryOnJob> {
  const fd = new FormData()
  fd.append("person_image", personFile)
  fd.append("garment_image", garmentFile)

  const res = await fetch(apiUrl("/tryon/anonymous"), {
    method: "POST",
    body: fd,
    headers: authHeaders(opts),
  })
  if (res.status === 429) {
    const text = await res.text().catch(() => "")
    throw new QuotaExceededError(text || "Daily quota exceeded")
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
  return (await res.json()) as TryOnJob
}

export async function getTryOnJob(jobId: string): Promise<TryOnJob> {
  const res = await fetch(apiUrl(`/tryon/jobs/${jobId}`))
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return (await res.json()) as TryOnJob
}

export async function pollTryOn(
  jobId: string,
  opts: {
    onUpdate?: (job: TryOnJob) => void
    intervalMs?: number
    timeoutMs?: number
    signal?: AbortSignal
  } = {},
): Promise<TryOnJob> {
  const interval = opts.intervalMs ?? 2000
  const timeout = opts.timeoutMs ?? 120_000
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError")

    const job = await getTryOnJob(jobId)
    opts.onUpdate?.(job)

    if (job.status === "completed" || job.status === "succeeded") {
      return { ...job, output_image_url: resolveImageUrl(job.output_image_url) }
    }
    if (job.status === "failed") {
      throw new Error(job.failure_reason || "Try-on failed")
    }

    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error("Timeout waiting for try-on job")
}

export async function requestEmailCode(email: string): Promise<{ devCode?: string }> {
  const res = await fetch(apiUrl("/auth/b2c/request-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return { devCode: data.dev_code }
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ token: string }> {
  const res = await fetch(apiUrl("/auth/b2c/verify-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return { token: data.access_token }
}

async function authedFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type") && typeof init.body === "string") {
    headers.set("Content-Type", "application/json")
  }
  return fetch(apiUrl(path), { ...init, headers })
}

async function expectJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

export async function saveWardrobeItem(
  token: string,
  payload: { image_url: string; name?: string; category?: GarmentCategory },
): Promise<WardrobeItem> {
  const res = await authedFetch("/b2c/wardrobe/items", token, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return expectJson<WardrobeItem>(res)
}

export async function listWardrobe(token: string): Promise<WardrobeItem[]> {
  const res = await authedFetch("/b2c/wardrobe/items", token)
  return expectJson<WardrobeItem[]>(res)
}

export async function deleteWardrobeItem(
  token: string,
  id: number,
): Promise<void> {
  const res = await authedFetch(`/b2c/wardrobe/items/${id}`, token, {
    method: "DELETE",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
}

export async function createOutfit(
  token: string,
  payload: { name: string; item_ids: number[] },
): Promise<Outfit> {
  const res = await authedFetch("/b2c/wardrobe/outfits", token, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return expectJson<Outfit>(res)
}

export async function listOutfits(token: string): Promise<Outfit[]> {
  const res = await authedFetch("/b2c/wardrobe/outfits", token)
  return expectJson<Outfit[]>(res)
}

export async function tryOnOutfit(
  token: string,
  outfitId: string,
  personFile: File,
): Promise<TryOnJob> {
  const fd = new FormData()
  fd.append("person_image", personFile)
  const res = await fetch(apiUrl(`/b2c/wardrobe/outfits/${outfitId}/tryon`), {
    method: "POST",
    body: fd,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 429) {
    const text = await res.text().catch(() => "")
    throw new QuotaExceededError(text || "Daily quota exceeded")
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
  return (await res.json()) as TryOnJob
}

export async function deleteOutfit(token: string, id: string): Promise<void> {
  const res = await authedFetch(`/b2c/wardrobe/outfits/${id}`, token, {
    method: "DELETE",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }
}
