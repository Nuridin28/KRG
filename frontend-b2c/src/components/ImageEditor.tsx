import { useCallback, useEffect, useMemo, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import {
  ArrowRight,
  Check,
  Loader2,
  RotateCw,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import {
  applyCropAndResize,
  removeBackground,
  type PixelCrop,
} from "@/lib/imageEdit"

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

type Step = "crop" | "bg"

export function ImageEditor({ open, source, onClose, onConfirm }: ImageEditorProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>("crop")

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect] = useState<AspectKey>("free")
  const [cropPixels, setCropPixels] = useState<PixelCrop | null>(null)

  const [croppedFile, setCroppedFile] = useState<File | null>(null)
  const [bgRemovedFile, setBgRemovedFile] = useState<File | null>(null)
  const [useBgRemoved, setUseBgRemoved] = useState(false)
  const [bgLoading, setBgLoading] = useState(false)
  const [bgError, setBgError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const sourceUrl = useMemo(
    () => (source ? URL.createObjectURL(source) : ""),
    [source],
  )
  useEffect(() => {
    if (!sourceUrl) return
    return () => URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  const previewUrl = useMemo(() => {
    const file = useBgRemoved && bgRemovedFile ? bgRemovedFile : croppedFile
    return file ? URL.createObjectURL(file) : ""
  }, [useBgRemoved, bgRemovedFile, croppedFile])
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  // Lock scroll, register Esc
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

  const goToBgStep = async () => {
    if (!source || !cropPixels) return
    setApplying(true)
    try {
      const cropped = await applyCropAndResize(source, cropPixels, rotation, "cropped.png")
      setCroppedFile(cropped)
      setBgRemovedFile(null)
      setUseBgRemoved(false)
      setBgError(null)
      setStep("bg")
    } finally {
      setApplying(false)
    }
  }

  const handleBgToggle = async (next: boolean) => {
    if (!next) {
      setUseBgRemoved(false)
      return
    }
    if (bgRemovedFile) {
      setUseBgRemoved(true)
      return
    }
    if (!croppedFile) return
    setBgLoading(true)
    setBgError(null)
    try {
      const result = await removeBackground(croppedFile, "no-bg.png")
      setBgRemovedFile(result)
      setUseBgRemoved(true)
    } catch (e) {
      setBgError((e as Error).message || t.editor.bgError)
    } finally {
      setBgLoading(false)
    }
  }

  const handleApply = () => {
    const finalFile =
      useBgRemoved && bgRemovedFile ? bgRemovedFile : croppedFile
    if (finalFile) onConfirm(finalFile)
  }

  if (!open || !source) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop — only visible on tablet+ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden sm:block"
        onClick={onClose}
      />

      {/* Sheet — fullscreen on mobile, centered on desktop */}
      <div
        className={cn(
          "relative z-10 flex w-full flex-col bg-card",
          "h-[100dvh] sm:my-auto sm:mx-auto sm:h-auto sm:max-h-[90dvh] sm:w-[680px] sm:max-w-[calc(100vw-2rem)]",
          "sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl animate-in",
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Header */}
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

          {/* Step indicator: pills on all sizes */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 transition",
                step === "crop"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              1
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 transition",
                step === "bg"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              2
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.editor.cancel}
            className="hidden size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition sm:inline-flex"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Body — flex-1 fills remaining height */}
        {step === "crop" ? (
          <CropStep
            sourceUrl={sourceUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ASPECTS.find((a) => a.key === aspect)?.ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            aspectKey={aspect}
            setAspect={setAspect}
            onCancel={onClose}
            onNext={goToBgStep}
            applying={applying}
            cropReady={!!cropPixels}
          />
        ) : (
          <BgStep
            previewUrl={previewUrl}
            bgLoading={bgLoading}
            bgError={bgError}
            useBgRemoved={useBgRemoved}
            bgFileReady={!!bgRemovedFile}
            onToggle={handleBgToggle}
            onBack={() => setStep("crop")}
            onApply={handleApply}
            applyDisabled={!croppedFile || bgLoading}
          />
        )}
      </div>
    </div>
  )
}

interface CropStepProps {
  sourceUrl: string
  crop: { x: number; y: number }
  zoom: number
  rotation: number
  aspect: number | undefined
  onCropChange: (c: { x: number; y: number }) => void
  onZoomChange: (z: number) => void
  onRotationChange: (r: number) => void
  onCropComplete: (a: Area, p: Area) => void
  aspectKey: AspectKey
  setAspect: (a: AspectKey) => void
  onCancel: () => void
  onNext: () => void
  applying: boolean
  cropReady: boolean
}

function CropStep(props: CropStepProps) {
  const { t } = useI18n()
  return (
    <>
      {/* Cropper canvas — flex grows to fill */}
      <div className="relative flex-1 bg-black/95">
        <Cropper
          image={props.sourceUrl}
          crop={props.crop}
          zoom={props.zoom}
          rotation={props.rotation}
          aspect={props.aspect}
          onCropChange={props.onCropChange}
          onZoomChange={props.onZoomChange}
          onRotationChange={props.onRotationChange}
          onCropComplete={props.onCropComplete}
          showGrid
          objectFit="contain"
        />
      </div>

      {/* Controls + footer */}
      <div className="shrink-0 border-t border-border bg-card">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ASPECTS.map((a) => {
              const isActive = props.aspectKey === a.key
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => props.setAspect(a.key)}
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
              onClick={() => props.onRotationChange((props.rotation + 90) % 360)}
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
            onClick={props.onCancel}
            className="rounded-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition"
          >
            {t.editor.cancel}
          </button>
          <button
            type="button"
            onClick={props.onNext}
            disabled={props.applying || !props.cropReady}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50 sm:flex-initial"
          >
            {props.applying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {t.editor.next}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </footer>
      </div>
    </>
  )
}

interface BgStepProps {
  previewUrl: string
  bgLoading: boolean
  bgError: string | null
  useBgRemoved: boolean
  bgFileReady: boolean
  onToggle: (next: boolean) => void
  onBack: () => void
  onApply: () => void
  applyDisabled: boolean
}

function BgStep(props: BgStepProps) {
  const { t } = useI18n()
  return (
    <>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
        style={{
          backgroundImage:
            "linear-gradient(45deg, var(--muted) 25%, transparent 25%), linear-gradient(-45deg, var(--muted) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--muted) 75%), linear-gradient(-45deg, transparent 75%, var(--muted) 75%)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
        }}
      >
        {props.previewUrl && (
          <img
            src={props.previewUrl}
            alt={t.editor.preview}
            className="max-h-full max-w-full object-contain animate-in"
          />
        )}
        {props.bgLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 px-6 text-center text-white">
              <Loader2 className="size-7 animate-spin" />
              <p className="text-sm font-medium">{t.editor.bgProcessing}</p>
              {!props.bgFileReady && (
                <p className="max-w-[260px] text-xs text-white/70">
                  {t.editor.bgFirstHint}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition active:scale-[0.99]">
            <div className="flex-1">
              <span className="text-sm font-medium">{t.editor.bgToggle}</span>
              {!props.bgFileReady && !props.bgLoading && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.editor.bgFirstHint}
                </p>
              )}
            </div>
            <span
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
                props.useBgRemoved ? "bg-foreground" : "bg-muted",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={props.useBgRemoved}
                disabled={props.bgLoading}
                onChange={(e) => props.onToggle(e.target.checked)}
              />
              <span
                className={cn(
                  "inline-block size-6 transform rounded-full bg-background shadow transition",
                  props.useBgRemoved ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </span>
          </label>
          {props.bgError && (
            <p className="mt-2 text-xs text-danger">{props.bgError}</p>
          )}
        </div>

        <footer
          className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={props.onBack}
            className="rounded-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← {t.editor.back}
          </button>
          <button
            type="button"
            onClick={props.onApply}
            disabled={props.applyDisabled}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50 sm:flex-initial"
          >
            <Check className="size-4" />
            {t.editor.apply}
          </button>
        </footer>
      </div>
    </>
  )
}
