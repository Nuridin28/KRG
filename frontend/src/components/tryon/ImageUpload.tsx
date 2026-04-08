import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, X, Image as ImageIcon, Camera, SwitchCamera, CircleDot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n"

interface ImageUploadProps {
  onImageSelected: (file: File) => void
  selectedImage: File | null
}

const MAX_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function ImageUpload({ onImageSelected, selectedImage }: ImageUploadProps) {
  const t = useT()
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"upload" | "camera">("upload")
  const [cameraReady, setCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const validateAndSet = useCallback(
    (file: File) => {
      setError(null)
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(t.imageUpload.onlyFormats)
        return
      }
      if (file.size > MAX_SIZE) {
        setError(t.imageUpload.maxSize)
        return
      }
      const url = URL.createObjectURL(file)
      setPreview(url)
      onImageSelected(file)
    },
    [onImageSelected, t]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      if (file) validateAndSet(file)
    },
    [validateAndSet]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSet(file)
  }

  const clearImage = () => {
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  // --- Camera logic ---
  const startCamera = useCallback(async () => {
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraReady(true)
        }
      }
    } catch (err) {
      setError(t.imageUpload.cameraError)
      setMode("upload")
    }
  }, [facingMode, t])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Mirror for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })
        const url = URL.createObjectURL(file)
        setPreview(url)
        onImageSelected(file)
        stopCamera()
        setMode("upload")
      },
      "image/jpeg",
      0.92
    )
  }, [facingMode, onImageSelected, stopCamera])

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }

  useEffect(() => {
    if (mode === "camera") {
      startCamera()
    } else {
      stopCamera()
    }
    return stopCamera
  }, [mode, startCamera, stopCamera])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (mode === "camera") {
      startCamera()
    }
  }, [facingMode, mode, startCamera])

  return (
    <div className="space-y-3">
      {/* Mode switcher */}
      {!preview && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("upload")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              mode === "upload"
                ? "border-foreground/40 bg-foreground/3 text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Upload className="h-4 w-4" />
            {t.imageUpload.uploadPhoto}
          </button>
          <button
            onClick={() => setMode("camera")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              mode === "camera"
                ? "border-foreground/40 bg-foreground/3 text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Camera className="h-4 w-4" />
            {t.imageUpload.camera}
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && selectedImage ? (
        <div className="relative">
          <img
            src={preview}
            alt=""
            className="aspect-3/4 w-full rounded-lg object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : mode === "camera" ? (
        /* Camera view */
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`aspect-3/4 w-full object-cover ${facingMode === "user" ? "transform-[scaleX(-1)]" : ""}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraReady && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-linear-to-t from-black/60 to-transparent pb-4 pt-10">
              <button
                onClick={toggleFacingMode}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                title={t.imageUpload.switchCamera}
              >
                <SwitchCamera className="h-5 w-5" />
              </button>
              <button
                onClick={capturePhoto}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-foreground text-background shadow-lg transition-transform active:scale-90"
                title={t.imageUpload.takePhoto}
              >
                <CircleDot className="h-7 w-7" />
              </button>
              <button
                onClick={() => { stopCamera(); setMode("upload") }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                title={t.imageUpload.closeCamera}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
        </div>
      ) : (
        /* File upload drop zone */
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all duration-200 ${
            dragActive ? "border-foreground bg-foreground/3" : "border-border hover:border-foreground/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">{t.imageUpload.dropHere}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.imageUpload.orClick}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {t.imageUpload.tip}
        </p>
      </div>
    </div>
  )
}
