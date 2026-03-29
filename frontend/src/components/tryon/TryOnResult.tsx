import { useState } from "react"
import { ShoppingCart, Sparkles, AlertCircle, Loader2, ArrowDown, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { TryOnJob } from "@/api/types"

interface TryOnResultProps {
  job: TryOnJob | null
  personPreview: string | null
  onBuildOutfit: () => void
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "В очереди..."
    case "processing":
      return "Обработка изображения..."
    case "completed":
      return "Готово!"
    case "failed":
      return "Ошибка"
    default:
      return status
  }
}

export function TryOnResult({ job, personPreview, onBuildOutfit }: TryOnResultProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-20 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium">Результат примерки</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Загрузите фото и выберите товар для виртуальной примерки
        </p>
      </div>
    )
  }

  if (job.status === "queued" || job.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-20 text-center">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-coral" />
        <p className="text-sm font-medium">{getStatusLabel(job.status)}</p>
        <Progress
          value={job.progress}
          className="mx-auto mt-4 max-w-xs"
          indicatorClassName="bg-coral"
        />
        <p className="mt-2 text-xs text-muted-foreground">{job.progress}%</p>
      </div>
    )
  }

  if (job.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 py-20 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-destructive">Не удалось выполнить примерку</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {job.failure_reason || "Попробуйте загрузить другое фото"}
        </p>
      </div>
    )
  }

  // completed
  return (
    <div className="space-y-4">
      {/* Before */}
      {personPreview && (
        <div className="space-y-2">
          <p className="text-center text-sm font-semibold text-muted-foreground">До</p>
          <div
            className="group relative cursor-pointer overflow-hidden rounded-xl border shadow-sm"
            onClick={() => setZoomedImage(personPreview)}
          >
            <img
              src={personPreview}
              alt="Оригинальное фото"
              className="w-full rounded-xl object-contain"
              style={{ maxHeight: "60vh" }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
              <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Arrow */}
      {personPreview && (
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10">
            <ArrowDown className="h-5 w-5 text-coral" />
          </div>
        </div>
      )}

      {/* After */}
      <div className="space-y-2">
        <p className="text-center text-sm font-semibold text-coral">После</p>
        {job.output_image_url ? (
          <div
            className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-coral/30 shadow-lg"
            onClick={() => setZoomedImage(job.output_image_url!)}
          >
            <img
              src={job.output_image_url}
              alt="Результат примерки"
              className="w-full rounded-xl object-contain"
              style={{ maxHeight: "70vh" }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
              <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
          </div>
        ) : (
          <div className="flex aspect-3/4 items-center justify-center rounded-xl bg-muted">
            <p className="text-xs text-muted-foreground">Изображение недоступно</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="coral" className="flex-1">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Добавить в корзину
        </Button>
        <Button variant="outline" className="flex-1" onClick={onBuildOutfit}>
          <Sparkles className="mr-2 h-4 w-4" />
          Собрать образ
        </Button>
      </div>

      {/* Fullscreen zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Увеличенное фото"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
          <button
            className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
            onClick={() => setZoomedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
