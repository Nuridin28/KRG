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
  failure_reason?: string | null
  provider_used?: string | null
  current_step?: string | null
}

export async function startAnonymousTryOn(
  personFile: File,
  garmentFile: File,
): Promise<TryOnJob> {
  const fd = new FormData()
  fd.append("person_image", personFile)
  fd.append("garment_image", garmentFile)

  const res = await fetch(apiUrl("/tryon/anonymous"), {
    method: "POST",
    body: fd,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Не удалось создать задачу (HTTP ${res.status})`)
  }
  return (await res.json()) as TryOnJob
}

export async function getTryOnJob(jobId: string): Promise<TryOnJob> {
  const res = await fetch(apiUrl(`/tryon/jobs/${jobId}`))
  if (!res.ok) {
    throw new Error(`Не удалось получить статус (HTTP ${res.status})`)
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
      throw new Error(job.failure_reason || "Примерка не удалась")
    }

    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error("Превышено время ожидания. Попробуйте ещё раз.")
}
