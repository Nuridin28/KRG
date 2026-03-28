import { ShoppingCart, Sparkles, AlertCircle, Loader2 } from "lucide-react"
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
      <div className="grid grid-cols-2 gap-4">
        {personPreview && (
          <div className="space-y-2">
            <p className="text-center text-xs font-medium text-muted-foreground">До</p>
            <img
              src={personPreview}
              alt="Оригинальное фото"
              className="aspect-[3/4] w-full rounded-lg object-cover"
            />
          </div>
        )}
        <div className="space-y-2">
          <p className="text-center text-xs font-medium text-muted-foreground">После</p>
          {job.output_image_url ? (
            <img
              src={job.output_image_url}
              alt="Результат примерки"
              className="aspect-[3/4] w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Изображение недоступно</p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}
