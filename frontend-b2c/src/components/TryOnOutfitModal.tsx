import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Check,
  Download,
  Loader2,
  Sparkles,
  Upload,
  X,
  AlertCircle,
} from "lucide-react"
import { cn, resolveImageUrl } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { useAuth } from "@/auth/context"
import {
  pollTryOn,
  QuotaExceededError,
  tryOnOutfit,
  type Outfit,
} from "@/lib/api"

interface TryOnOutfitModalProps {
  open: boolean
  outfit: Outfit | null
  onClose: () => void
}

type Status = "upload" | "processing" | "success" | "error"

export function TryOnOutfitModal({ open, outfit, onClose }: TryOnOutfitModalProps) {
  const { t } = useI18n()
  const auth = useAuth()
  const [personFile, setPersonFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>("upload")
  const [progress, setProgress] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const personPreview = useMemo(
    () => (personFile ? URL.createObjectURL(personFile) : null),
    [personFile],
  )
  useEffect(() => {
    if (!personPreview) return
    return () => URL.revokeObjectURL(personPreview)
  }, [personPreview])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "processing") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", onKey)
    }
  }, [open, status, onClose])

  if (!open || !outfit) return null

  const handleStart = async () => {
    if (!personFile || !auth.token) return
    setStatus("processing")
    setProgress(5)
    setError(null)
    try {
      const job = await tryOnOutfit(auth.token, outfit.id, personFile)
      const final = await pollTryOn(job.job_id, {
        onUpdate: (j) => setProgress(j.progress ?? 0),
        timeoutMs: 180_000,
      })
      setResultUrl(final.output_image_url ?? null)
      setStatus("success")
      auth.decrementQuotaLocally()
      auth.refreshQuota()
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        setError(t.account.quotaExhausted)
      } else {
        setError((e as Error).message || t.outfits.tryonError)
      }
      setStatus("error")
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden sm:block"
        onClick={() => status !== "processing" && onClose()}
      />
      <div
        className={cn(
          "relative z-10 flex w-full flex-col bg-card",
          "h-[100dvh] sm:my-auto sm:mx-auto sm:h-auto sm:max-h-[90dvh] sm:w-[520px] sm:max-w-[calc(100vw-2rem)]",
          "sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl animate-in",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="font-display text-base font-medium tracking-tight sm:text-xl">
            {t.outfits.tryonTitle.replace("{name}", outfit.name)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={status === "processing"}
            aria-label={t.outfits.cancel}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {/* Outfit preview */}
          <div className="mb-5">
            <div className="grid grid-cols-4 gap-2">
              {outfit.items.slice(0, 4).map((it) => (
                <div
                  key={it.id}
                  className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {it.image_url && (
                    <img
                      src={resolveImageUrl(it.image_url)}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {outfit.items.length} · {t.outfits.tryonHint}
            </p>
          </div>

          {status === "upload" && (
            <UploadView
              file={personFile}
              previewUrl={personPreview}
              onChange={setPersonFile}
            />
          )}

          {status === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="size-8 animate-spin text-accent" />
              <p className="text-sm font-medium">{t.outfits.tryonProcessing}</p>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-accent transition-[width] duration-500"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
            </div>
          )}

          {status === "success" && resultUrl && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={resolveImageUrl(resultUrl)}
                alt={t.outfits.tryonSuccess}
                className="max-h-[60dvh] rounded-2xl border border-border object-contain animate-in"
              />
              <a
                href={resolveImageUrl(resultUrl)}
                download={`${outfit.name}.png`}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
              >
                <Download className="size-4" />
                {t.outfits.saveResult}
              </a>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                <AlertCircle className="size-6" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                {error || t.outfits.tryonError}
              </p>
            </div>
          )}
        </div>

        {status === "upload" && (
          <footer
            className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition"
            >
              {t.outfits.cancel}
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={!personFile}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50 sm:flex-initial"
            >
              <Sparkles className="size-4" />
              {t.outfits.tryonStart}
              <ArrowRight className="size-4" />
            </button>
          </footer>
        )}

        {status === "error" && (
          <footer
            className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={() => setStatus("upload")}
              className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              <Check className="mr-1 inline size-4" />
              {t.outfits.tryonStart}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

function UploadView({
  file,
  previewUrl,
  onChange,
}: {
  file: File | null
  previewUrl: string | null
  onChange: (f: File | null) => void
}) {
  const { t } = useI18n()
  return (
    <label
      className={cn(
        "block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed",
        "bg-card transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30",
        previewUrl ? "border-solid border-border" : "border-border hover:border-foreground/40 hover:bg-muted/40",
      )}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={file?.name || ""} className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <Upload className="size-7" />
          <p className="text-sm font-medium">{t.dropzone.tap}</p>
          <p className="text-xs">{t.dropzone.personHint}</p>
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}
