import { useState, useEffect } from "react"
import { History, Trash2, Share2, ShoppingCart, Check } from "lucide-react"
import { api } from "@/api/client"
import { useCart } from "@/store/cart"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { useT } from "@/i18n"
import { resolveMediaUrl } from "@/lib/apiEnv"

interface SavedOutfit {
  id: string
  items: any[]
  style: string
  occasion: string
  total_price: number
  compatibility_score: number
  explanation: string
  badges: string[]
  created_at: string
}

export function OutfitHistoryPage() {
  const t = useT()
  const [outfits, setOutfits] = useState<SavedOutfit[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const addOutfit = useCart((s) => s.addOutfit)
  const isLoggedIn = useAuth((s) => s.isLoggedIn)

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false)
      return
    }
    api.savedOutfits.history(50)
      .then(setOutfits)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  const handleDelete = async (id: string) => {
    await api.savedOutfits.delete(id)
    setOutfits((prev) => prev.filter((o) => o.id !== id))
  }

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/outfit/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!isLoggedIn()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{t.history.title}</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
          <History className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium">{t.history.loginPrompt}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{t.history.title}</h1>
        <p className="py-12 text-center text-muted-foreground">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
        {t.history.title} <span className="text-muted-foreground font-normal text-lg">({outfits.length})</span>
      </h1>

      {outfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
          <History className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium">{t.history.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.history.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {outfits.map((outfit) => (
            <div key={outfit.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex gap-1.5">
                  {outfit.badges.map((b) => (
                    <Badge key={b} variant="coral" className="text-[10px]">{b}</Badge>
                  ))}
                  <Badge variant="secondary" className="text-[10px]">{outfit.style}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatPrice(outfit.total_price)}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{outfit.compatibility_score}%</span>
                </div>
              </div>

              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {outfit.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex min-w-22.5 flex-col items-center gap-1 rounded-lg border p-2">
                    <div className="h-14 w-14 overflow-hidden rounded-lg">
                      <img src={resolveMediaUrl(item.image_url)} alt={item.name} className="h-full w-full object-cover" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    </div>
                    <p className="line-clamp-1 text-center text-[10px] font-medium">{item.name}</p>
                    <p className="text-[9px] text-muted-foreground">{item.brand}</p>
                  </div>
                ))}
              </div>

              {outfit.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">{outfit.explanation}</p>
              )}

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="coral" className="text-xs" onClick={() => addOutfit(outfit.items)}>
                  <ShoppingCart className="mr-1 h-3 w-3" /> {t.common.buyAll}
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => handleShare(outfit.id)}>
                  {copiedId === outfit.id ? <Check className="mr-1 h-3 w-3" /> : <Share2 className="mr-1 h-3 w-3" />}
                  {copiedId === outfit.id ? t.common.copied : t.common.share}
                </Button>
                <Button size="sm" variant="outline" className="text-xs text-red-500 hover:text-red-600" onClick={() => handleDelete(outfit.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> {t.common.delete}
                </Button>
              </div>

              <p className="mt-2 text-[10px] text-muted-foreground">
                {new Date(outfit.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
