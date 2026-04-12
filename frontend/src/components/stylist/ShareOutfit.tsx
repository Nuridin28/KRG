import { useState, useRef, useCallback } from "react"
import { Share2, Copy, Download, Check, Link, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatPrice, cn } from "@/lib/utils"
import type { Outfit } from "@/api/types"
import { useT } from "@/i18n"
import { resolveMediaUrl } from "@/lib/apiEnv"

interface ShareOutfitProps {
  outfit: Outfit
  open: boolean
  onOpenChange: (open: boolean) => void
}

function generateShareUrl(outfit: Outfit): string {
  const payload = {
    id: outfit.id,
    items: outfit.items.map((i) => ({
      name: i.product.name,
      brand: i.product.brand,
      price: i.product.price,
      image: i.product.image_url,
      color: i.product.color_hex,
    })),
    score: outfit.compatibility_score,
    total: outfit.total_price,
    style: outfit.style,
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
  return `${window.location.origin}/outfit?data=${encoded}`
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#22c55e"
  if (score >= 50) return "#eab308"
  return "#ef4444"
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function renderOutfitToCanvas(outfit: Outfit): Promise<HTMLCanvasElement> {
  const CORAL = "#0a0a0a"
  const cols = Math.min(outfit.items.length, 3)
  const rows = Math.ceil(outfit.items.length / cols)
  const thumbSize = 140
  const thumbGap = 16
  const padding = 32
  const headerH = 72
  const footerH = 80
  const gridW = cols * thumbSize + (cols - 1) * thumbGap
  const gridH = rows * (thumbSize + 48) + (rows - 1) * thumbGap
  const canvasW = Math.max(gridW + padding * 2, 420)
  const canvasH = headerH + gridH + footerH + padding * 2

  const canvas = document.createElement("canvas")
  canvas.width = canvasW * 2
  canvas.height = canvasH * 2
  const ctx = canvas.getContext("2d")!
  ctx.scale(2, 2)

  // Background
  ctx.fillStyle = "#ffffff"
  drawRoundedRect(ctx, 0, 0, canvasW, canvasH, 16)
  ctx.fill()

  // Header bar
  ctx.fillStyle = CORAL
  drawRoundedRect(ctx, 0, 0, canvasW, headerH, 16)
  ctx.fill()
  // Flatten the bottom corners of the header
  ctx.fillRect(0, headerH - 16, canvasW, 16)

  // Branding text
  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.textBaseline = "middle"
  ctx.fillText("AI Stylist", padding, headerH / 2 - 2)

  // Score badge on right
  ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  const scoreText = `${outfit.compatibility_score}%`
  const scoreTW = ctx.measureText(scoreText).width
  const badgeX = canvasW - padding - scoreTW - 20
  const badgeY = headerH / 2 - 14
  ctx.fillStyle = "rgba(255,255,255,0.25)"
  drawRoundedRect(ctx, badgeX, badgeY, scoreTW + 20, 28, 14)
  ctx.fill()
  ctx.fillStyle = "#ffffff"
  ctx.fillText(scoreText, badgeX + 10, headerH / 2)

  // Style label
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.fillStyle = "rgba(255,255,255,0.8)"
  const styleLabel = `${outfit.style} \u2022 ${outfit.occasion}`
  ctx.fillText(styleLabel, padding, headerH / 2 + 16)

  // Product grid
  const gridStartX = (canvasW - gridW) / 2
  const gridStartY = headerH + padding

  const images: (HTMLImageElement | null)[] = await Promise.all(
    outfit.items.map((item) =>
      loadImage(resolveMediaUrl(item.product.image_url) || item.product.image_url).catch(() => null)
    )
  )

  for (let i = 0; i < outfit.items.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = gridStartX + col * (thumbSize + thumbGap)
    const y = gridStartY + row * (thumbSize + 48 + thumbGap)
    const item = outfit.items[i]
    const img = images[i]

    // Thumb background
    ctx.fillStyle = "#f5f5f5"
    drawRoundedRect(ctx, x, y, thumbSize, thumbSize, 12)
    ctx.fill()

    if (img) {
      ctx.save()
      drawRoundedRect(ctx, x, y, thumbSize, thumbSize, 12)
      ctx.clip()
      const scale = Math.max(thumbSize / img.width, thumbSize / img.height)
      const sw = img.width * scale
      const sh = img.height * scale
      ctx.drawImage(img, x + (thumbSize - sw) / 2, y + (thumbSize - sh) / 2, sw, sh)
      ctx.restore()
    } else {
      // Color swatch fallback
      ctx.fillStyle = item.product.color_hex || "#ccc"
      drawRoundedRect(ctx, x + 30, y + 30, thumbSize - 60, thumbSize - 60, 999)
      ctx.fill()
    }

    // Product name
    ctx.fillStyle = "#1a1a1a"
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    ctx.textBaseline = "top"
    const name = item.product.name.length > 18
      ? item.product.name.slice(0, 17) + "..."
      : item.product.name
    ctx.fillText(name, x, y + thumbSize + 6)

    // Price
    ctx.fillStyle = CORAL
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    const price = formatPrice(item.product.price)
    ctx.fillText(price, x, y + thumbSize + 22)
  }

  // Footer
  const footerY = canvasH - footerH
  ctx.fillStyle = "#fafafa"
  ctx.fillRect(0, footerY, canvasW, footerH)
  // Bottom rounded corners
  ctx.fillStyle = "#fafafa"
  drawRoundedRect(ctx, 0, footerY, canvasW, footerH, 16)
  ctx.fill()
  ctx.fillRect(0, footerY, canvasW, 16)

  // Separator
  ctx.strokeStyle = "#e5e5e5"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, footerY)
  ctx.lineTo(canvasW - padding, footerY)
  ctx.stroke()

  // Total price
  ctx.fillStyle = "#1a1a1a"
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.textBaseline = "middle"
  ctx.fillText(formatPrice(outfit.total_price), padding, footerY + footerH / 2 - 4)

  // Compatibility dot
  const dotX = canvasW - padding - 100
  ctx.fillStyle = getScoreColor(outfit.compatibility_score)
  ctx.beginPath()
  ctx.arc(dotX, footerY + footerH / 2 - 4, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#666"
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.fillText(`compatibility`, dotX + 12, footerY + footerH / 2 - 4)

  // KRG branding small
  ctx.fillStyle = "#bbb"
  ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  ctx.textBaseline = "bottom"
  ctx.fillText("krg.style", canvasW - padding - ctx.measureText("krg.style").width, canvasH - 10)

  return canvas
}

export function ShareOutfit({ outfit, open, onOpenChange }: ShareOutfitProps) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  const handleCopyLink = useCallback(async () => {
    const url = generateShareUrl(outfit)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      showToast(t.share.linkCopied)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast(t.common.error)
    }
  }, [outfit, showToast, t])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const canvas = await renderOutfitToCanvas(outfit)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `outfit-${outfit.id}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast(t.share.imageSaved)
      }, "image/png")
    } catch {
      showToast(t.common.error)
    } finally {
      setDownloading(false)
    }
  }, [outfit, showToast, t])

  const handleWebShare = useCallback(async () => {
    const url = generateShareUrl(outfit)
    try {
      await navigator.share({
        title: "AI Stylist",
        text: `${outfit.compatibility_score}%. ${formatPrice(outfit.total_price)}`,
        url,
      })
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        showToast(t.common.error)
      }
    }
  }, [outfit, showToast, t])

  const canWebShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-foreground" />
            {t.share.title}
          </DialogTitle>
          <DialogDescription>
            {t.share.subtitle}
          </DialogDescription>
        </DialogHeader>

        {/* Preview card */}
        <div className="fade-in-up rounded-xl border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              AI Stylist
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold text-white",
                outfit.compatibility_score >= 75
                  ? "bg-green-500"
                  : outfit.compatibility_score >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )}
            >
              {outfit.compatibility_score}%
            </span>
          </div>

          {/* Image grid */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {outfit.items.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="fade-in-up aspect-square overflow-hidden rounded-lg border bg-background"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <img
                  src={resolveMediaUrl(item.product.image_url)}
                  alt={item.product.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    target.parentElement!.innerHTML = `<div class="h-full w-full flex items-center justify-center" style="background-color: ${item.product.color_hex || "#eee"}"><span class="text-[10px] text-white/70">${item.product.brand}</span></div>`
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-base font-bold">
              {formatPrice(outfit.total_price)}
            </span>
            <span className="text-xs text-muted-foreground">
              {outfit.style} &middot; {outfit.occasion}
            </span>
          </div>
        </div>

        {/* Share actions */}
        <div className="fade-in-up grid gap-2" style={{ animationDelay: "100ms" }}>
          <Button
            variant="coral"
            className="w-full justify-start gap-3"
            onClick={handleCopyLink}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? t.share.copiedLink : t.share.copyLink}
            <Link className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            {downloading ? t.share.downloadingImage : t.share.downloadImage}
          </Button>

          {canWebShare && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleWebShare}
            >
              <ExternalLink className="h-4 w-4" />
              {t.share.shareButton}
            </Button>
          )}
        </div>

        {/* Toast notification */}
        {toast && (
          <div className="fade-in-up fixed bottom-6 left-1/2 z-100 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
            {toast}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
