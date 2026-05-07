import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ImagePlus, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"

interface ImageDropzoneProps {
  label: string
  description: string
  file: File | null
  onChange: (file: File | null) => void
  accent?: "person" | "garment"
}

const MAX_SIZE = 12 * 1024 * 1024 // 12MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]

export function ImageDropzone({
  label,
  description,
  file,
  onChange,
  accent = "person",
}: ImageDropzoneProps) {
  const { t } = useI18n()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const validate = useCallback(
    (f: File): string | null => {
      if (!ACCEPTED.includes(f.type)) return t.dropzone.errorType
      if (f.size > MAX_SIZE) return t.dropzone.errorSize
      return null
    },
    [t.dropzone.errorType, t.dropzone.errorSize],
  )

  const handleFile = useCallback(
    (f: File | undefined | null) => {
      if (!f) return
      const err = validate(f)
      if (err) {
        setError(err)
        return
      }
      setError(null)
      onChange(f)
    },
    [onChange, validate],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="size-3" />
            {t.dropzone.replace}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">{t.dropzone.sizeHint}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label={label}
        className={cn(
          "group relative flex aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-dashed bg-card transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          dragOver
            ? "border-accent scale-[1.01] shadow-lg shadow-accent/20"
            : "border-border hover:border-foreground/40 hover:bg-muted/40",
          previewUrl && "border-solid",
        )}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={label}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              type="button"
              onClick={clear}
              aria-label={t.dropzone.remove}
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full transition-colors",
                accent === "person"
                  ? "bg-accent/10 text-accent"
                  : "bg-foreground/5 text-foreground",
              )}
            >
              <ImagePlus className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium">{t.dropzone.tap}</p>
              {description && (
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        )}
      </button>

      {error && (
        <p className="text-xs text-danger animate-in" role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
