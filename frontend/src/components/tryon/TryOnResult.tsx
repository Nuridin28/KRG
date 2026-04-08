import { useState, useEffect, useCallback, useRef } from "react"
import { ShoppingCart, Sparkles, AlertCircle, Loader2, ArrowDown, ZoomIn, Play, RotateCw, Image as ImageIcon, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { api } from "@/api/client"
import { useToast } from "@/hooks/use-toast"
import type { TryOnJob, VideoJob } from "@/api/types"
import { useT } from "@/i18n"

interface TryOnResultProps {
  job: TryOnJob | null
  personPreview: string | null
  onBuildOutfit: () => void
}

type ViewMode = "photo" | "video"

export function TryOnResult({ job, personPreview, onBuildOutfit }: TryOnResultProps) {
  const t = useT()

  function getStatusLabel(status: string): string {
    switch (status) {
      case "queued":
        return t.tryon.queued
      case "processing":
        return t.tryon.processing
      case "completed":
        return t.tryon.completed
      case "failed":
        return t.tryon.failed
      default:
        return status
    }
  }

  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("photo")
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useToast()

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Reset video job when try-on job changes
  useEffect(() => {
    setVideoJob(null)
    setViewMode("photo")
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [job?.job_id])

  const startVideoPolling = useCallback((jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const updated = await api.video.getJob(jobId)
        setVideoJob(updated)
        if (updated.status === "completed" || updated.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current)
          pollingRef.current = null
          if (updated.status === "completed") {
            setViewMode("video")
          }
          if (updated.status === "failed") {
            toast({ title: t.tryon.videoFailed, description: updated.failure_reason || "" })
          }
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }, 3000)
  }, [toast, t])

  const handleGenerateVideo = useCallback(async () => {
    if (!job?.output_image_url) return
    setVideoLoading(true)
    setVideoJob(null)
    try {
      const vJob = await api.video.generate(job.output_image_url)
      setVideoJob(vJob)
      startVideoPolling(vJob.job_id)
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message })
    } finally {
      setVideoLoading(false)
    }
  }, [job, startVideoPolling, toast, t])

  const hasVideo = videoJob?.status === "completed" && videoJob.video_url
  const videoGenerating = videoJob && (videoJob.status === "queued" || videoJob.status === "processing")

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-20 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium">{t.tryon.title}</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t.tryon.subtitle.replace("{max}", "5")}
        </p>
      </div>
    )
  }

  if (job.status === "queued" || job.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-20 text-center">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-medium">{getStatusLabel(job.status)}</p>
        <Progress
          value={job.progress}
          className="mx-auto mt-4 max-w-xs"
          indicatorClassName="bg-foreground"
        />
        <p className="mt-2 text-xs text-muted-foreground">{job.progress}%</p>
      </div>
    )
  }

  if (job.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 py-20 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-destructive">{t.tryon.failedTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {job.failure_reason || t.tryon.failedHint}
        </p>
      </div>
    )
  }

  // completed
  return (
    <div className="space-y-4">
      {/* Before / After comparison */}
      {personPreview && (
        <>
          <div className="space-y-2">
            <p className="text-center text-sm font-semibold text-muted-foreground">{t.tryon.before}</p>
            <div
              className="group relative cursor-pointer overflow-hidden rounded-xl border shadow-sm"
              onClick={() => setZoomedImage(personPreview)}
            >
              <img
                src={personPreview}
                alt={t.tryon.before}
                className="w-full rounded-xl object-contain"
                style={{ maxHeight: "50vh" }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
              <ArrowDown className="h-5 w-5 text-foreground" />
            </div>
          </div>
        </>
      )}

      {/* Result section — photo + video tabs */}
      <div className="space-y-3">
        {/* Tab switcher — only when video exists or is generating */}
        {(hasVideo || videoGenerating) && (
          <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setViewMode("photo")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                viewMode === "photo"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {t.common.photo}
            </button>
            <button
              onClick={() => hasVideo && setViewMode("video")}
              disabled={!hasVideo}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                viewMode === "video"
                  ? "bg-background text-foreground shadow-sm"
                  : !hasVideo
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {videoGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Film className="h-3.5 w-3.5" />
              )}
              {videoGenerating ? t.common.generating : t.common.video}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="relative">
          <p className="mb-2 text-center text-sm font-semibold text-foreground">
            {viewMode === "video" ? t.common.inMotion : t.tryon.after}
          </p>

          {/* Photo view */}
          {viewMode === "photo" && job.output_image_url && (
            <div
              className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-foreground/15 shadow-lg"
              onClick={() => setZoomedImage(job.output_image_url!)}
            >
              <img
                src={job.output_image_url}
                alt={t.tryon.after}
                className="w-full rounded-xl object-contain"
                style={{ maxHeight: "65vh" }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
              </div>

              {/* Floating "generate video" overlay — when no video yet */}
              {!hasVideo && !videoGenerating && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGenerateVideo()
                  }}
                  disabled={videoLoading}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/80"
                >
                  {videoLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {t.common.inMotion}
                </button>
              )}
            </div>
          )}

          {/* Video view */}
          {viewMode === "video" && hasVideo && (
            <div className="overflow-hidden rounded-xl border-2 border-foreground/15 shadow-lg">
              <video
                src={videoJob!.video_url!}
                className="w-full rounded-xl"
                style={{ maxHeight: "65vh" }}
                controls
                autoPlay
                loop
                playsInline
                muted
              />
            </div>
          )}

          {/* No image fallback */}
          {viewMode === "photo" && !job.output_image_url && (
            <div className="flex aspect-3/4 items-center justify-center rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground">{t.tryon.failedHint}</p>
            </div>
          )}
        </div>
      </div>

      {/* Video generation progress bar — shown under content while generating */}
      {videoGenerating && (
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs font-medium">{t.tryon.videoCreating}</span>
            </div>
            <span className="text-xs text-muted-foreground">{videoJob!.progress}%</span>
          </div>
          <Progress
            value={videoJob!.progress}
            className="h-1.5 w-full"
            indicatorClassName="bg-foreground"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <Button variant="coral" className="flex-1">
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t.common.addToCart}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onBuildOutfit}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t.common.buildOutfit}
          </Button>
        </div>

        {/* Video action — only if no video yet and no floating button wasn't clicked */}
        {job.output_image_url && !hasVideo && !videoGenerating && (
          <Button
            variant="secondary"
            className="w-full"
            disabled={videoLoading}
            onClick={handleGenerateVideo}
          >
            {videoLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {t.tryon.showInMotion}
          </Button>
        )}

        {/* Regenerate video */}
        {hasVideo && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            disabled={!!videoGenerating || videoLoading}
            onClick={handleGenerateVideo}
          >
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
            {t.tryon.showInMotion}
          </Button>
        )}
      </div>

      {/* Fullscreen zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt=""
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
