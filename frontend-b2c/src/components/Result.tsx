import { Download, Loader2, Sparkles, AlertCircle, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"

interface ResultProps {
  status: "idle" | "processing" | "success" | "error"
  progress: number
  imageUrl?: string | null
  error?: string | null
  currentStep?: string | null
  onReset: () => void
}

export function Result({
  status,
  progress,
  imageUrl,
  error,
  currentStep,
  onReset,
}: ResultProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-medium tracking-tight">
          {status === "success" ? t.result.done : t.result.title}
        </h3>
        {status !== "idle" && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <RotateCcw className="size-3" />
            {t.result.reset}
          </button>
        )}
      </div>

      <div className="mt-6 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl bg-muted">
        {status === "idle" && (
          <div className="flex flex-col items-center gap-3 px-6 text-center text-muted-foreground">
            <Sparkles className="size-7 opacity-50" />
            <p className="text-sm">{t.result.idle}</p>
          </div>
        )}

        {status === "processing" && (
          <div className="relative flex size-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="absolute inset-0 shimmer" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <Loader2 className="size-6 animate-spin text-accent" />
              <div>
                <p className="text-sm font-medium">{t.result.processing}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentStep || t.result.processingHint}
                </p>
              </div>
              <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full bg-accent transition-[width] duration-500"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {status === "success" && imageUrl && (
          <img
            src={imageUrl}
            alt={t.result.done}
            className="size-full object-cover animate-in"
          />
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium">{t.result.error}</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                {error || t.result.errorHint}
              </p>
            </div>
          </div>
        )}
      </div>

      {status === "success" && imageUrl && (
        <a
          href={imageUrl}
          download="tryon-result.png"
          className={cn(
            "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3",
            "text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.99]",
          )}
        >
          <Download className="size-4" />
          {t.result.download}
        </a>
      )}
    </div>
  )
}
