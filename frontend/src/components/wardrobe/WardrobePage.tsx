import { useState, useEffect, useCallback } from "react"
import { Shirt, Trash2, Sparkles, Loader2, Upload, Camera } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/api/client"
import { useWardrobe } from "@/store/wardrobe"
import { useAuth } from "@/store/auth"
import { useToast } from "@/hooks/use-toast"
import { useT } from "@/i18n"
import { CapsuleAnalysis } from "./CapsuleAnalysis"
import type { CapsuleAnalysis as CapsuleAnalysisType } from "@/api/types"
import { resolveMediaUrl } from "@/lib/apiEnv"

export function WardrobePage() {
  const t = useT()
  const { items, setItems, removeItem, addItem } = useWardrobe()
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const { toast } = useToast()
  const [analysis, setAnalysis] = useState<CapsuleAnalysisType | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const CAT_LABELS: Record<string, string> = {
    tops: t.categories.tops, bottoms: t.categories.bottoms, dresses: t.categories.dresses,
    outerwear: t.categories.outerwear, shoes: t.categories.shoes, accessories: t.categories.accessories,
  }

  useEffect(() => {
    if (isLoggedIn()) {
      api.wardrobe.getItems().then(setItems).catch(() => {})
    }
  }, [isLoggedIn, setItems])

  const handleUploadPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t.wardrobe.fileTooLarge })
      return
    }

    setUploading(true)
    try {
      const item = await api.wardrobe.uploadPhoto(file)
      addItem(item)
      setAnalysis(null)
      toast({ title: t.wardrobe.itemRecognized, description: item.name })
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }, [addItem, toast, t])

  const handleRemove = useCallback(async (id: number) => {
    try {
      await api.wardrobe.removeItem(id)
      removeItem(id)
      setAnalysis(null)
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message })
    }
  }, [removeItem, toast, t])

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    try {
      const result = await api.wardrobe.analyze()
      setAnalysis(result)
    } catch (err: any) {
      toast({ title: t.wardrobe.analysisError, description: err.message })
    } finally {
      setAnalyzing(false)
    }
  }, [toast, t])

  // Group by category
  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    acc[it.category] = acc[it.category] || []
    acc[it.category].push(it)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          {t.wardrobe.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.wardrobe.subtitle}
        </p>
      </div>

      {/* Actions bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUploadPhoto}
            disabled={uploading}
          />
          <Button variant="coral" asChild disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
              {uploading ? t.wardrobe.recognizing : t.wardrobe.uploadPhoto}
            </span>
          </Button>
        </label>

        {items.length >= 2 && (
          <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {analyzing ? t.wardrobe.analyzing : t.wardrobe.analyzeButton}
          </Button>
        )}

        {items.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
            <Shirt className="h-3.5 w-3.5" />
            {items.length} {t.common.items}
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20">
              <Upload className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold">{t.wardrobe.emptyTitle}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t.wardrobe.emptyHint}
            </p>
            <label className="mt-5">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUploadPhoto}
                disabled={uploading}
              />
              <Button variant="coral" size="lg" asChild disabled={uploading}>
                <span className="cursor-pointer">
                  <Camera className="mr-2 h-4 w-4" />
                  {t.wardrobe.uploadFirst}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      ) : (
        /* Wardrobe grid by category */
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="animate-fade-in-up">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {CAT_LABELS[cat] || cat}
                </h3>
                <span className="text-xs text-muted-foreground/60">{catItems.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {catItems.map((item) => (
                  <Card key={item.id} className="group overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                    <div className="relative aspect-square bg-muted/30">
                      <img
                        src={resolveMediaUrl(item.image_url)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-16 w-16 rounded-full shadow-inner" style="background-color: ${item.color_hex || '#ccc'}"></div></div>`
                        }}
                      />
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500"
                        title={t.common.remove}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <CardContent className="p-2.5">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.color_hex || "#ccc" }} />
                        <span className="text-[10px] text-muted-foreground">{item.color_name}</span>
                      </div>
                      {item.style_tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.style_tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[8px] px-1 py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Upload more card */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleUploadPhoto}
                    disabled={uploading}
                  />
                  <Card className="flex h-full items-center justify-center border-dashed transition-all hover:border-foreground/30 hover:bg-accent/50">
                    <CardContent className="flex flex-col items-center gap-1.5 py-8 text-center">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-5 w-5 text-muted-foreground/40" />
                      )}
                      <span className="text-[10px] text-muted-foreground">{t.common.add}</span>
                    </CardContent>
                  </Card>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GPT Analysis results */}
      {analysis && (
        <div className="mt-10 animate-fade-in-up">
          <CapsuleAnalysis analysis={analysis} />
        </div>
      )}
    </div>
  )
}
