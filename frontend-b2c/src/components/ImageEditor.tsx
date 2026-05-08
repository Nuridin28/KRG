import { useCallback, useEffect, useMemo, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Check, Loader2, RotateCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { applyCropAndResize, type PixelCrop } from "@/lib/imageEdit"

type AspectKey = "free" | "1:1" | "3:4" | "9:16"
const ASPECTS: Array<{ key: AspectKey; label?: string; ratio?: number }> = [
  { key: "free" },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "3:4", label: "3:4", ratio: 3 / 4 },
  { key: "9:16", label: "9:16", ratio: 9 / 16 },
]

interface ImageEditorProps {
  open: boolean
  source: File | null
  onClose: () => void
  onConfirm: (file: File) => void
}

export function ImageEditor({ open, source, onClose, onConfirm }: ImageEditorProps) {
  const { t } = useI18n()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState<AspectKey>("free")
  const [cropPixels, setCropPixels] = useState<PixelCrop | null>(null)
  const [applying, setApplying] = useState(false)

  const sourceUrl = useMemo(
    () => (source ? URL.createObjectURL(source) : ""),
    [source],
  )
  useEffect(() => {
    if (!sourceUrl) return
    return () => URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropPixels({
      x: areaPixels.x,
      y: areaPixels.y,
      width: areaPixels.width,
      height: areaPixels.height,
    })
  }, [])

  const handleApply = async () => {
    if (!source || !cropPixels) return
    setApplying(true)
    try {
      const out = await applyCropAndResize(source, cropPixels, rotation, "edited.png")
      onConfirm(out)
    } finally {
      setApplying(false)
    }
  }

  if (!open || !source) return null

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden sm:block"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex w-full flex-col bg-card",
          "h-[100dvh] sm:my-auto sm:mx-auto sm:h-auto sm:max-h-[90dvh] sm:w-[680px] sm:max-w-[calc(100vw-2rem)]",
          "sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl animate-in",
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.editor.cancel}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition sm:hidden"
          >
            <X className="size-5" />
          </button>
          <h2 className="font-display text-base font-medium tracking-tight sm:text-xl">
            {t.editor.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.editor.cancel}
            className="hidden size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition sm:inline-flex"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="relative flex-1 bg-black/95">
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECTS.find((a) => a.key === aspect)?.ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
          />
        </div>

        <div className="shrink-0 border-t border-border bg-card">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ASPECTS.map((a) => {
                const isActive = aspect === a.key
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setAspect(a.key)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition",
                      isActive
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {a.label || t.editor.aspectFree}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label={t.editor.rotate}
                className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground/40 hover:text-foreground active:scale-95"
              >
                <RotateCw className="size-4" />
              </button>
            </div>
          </div>

          <footer
            className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition"
            >
              {t.editor.cancel}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || !cropPixels}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50 sm:flex-initial"
            >
              {applying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Check className="size-4" />
                  {t.editor.apply}
                </>
              )}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
