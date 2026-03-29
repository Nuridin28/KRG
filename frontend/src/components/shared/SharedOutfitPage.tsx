import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Loader2, ShoppingCart, Share2, Check } from "lucide-react"
import { api } from "@/api/client"
import { useCart } from "@/store/cart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"

export function SharedOutfitPage() {
  const { outfitId } = useParams()
  const [outfit, setOutfit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const addOutfit = useCart((s) => s.addOutfit)

  useEffect(() => {
    if (!outfitId) return
    api.savedOutfits.getShared(outfitId)
      .then(setOutfit)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [outfitId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !outfit) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-medium">Образ не найден</p>
        <p className="mt-1 text-sm text-muted-foreground">Возможно, ссылка устарела или образ был удалён</p>
      </div>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Подборка образа
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Кто-то поделился с вами стильным образом</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {outfit.badges?.map((b: string) => (
              <Badge key={b} variant="coral" className="text-[10px]">{b}</Badge>
            ))}
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{formatPrice(outfit.total_price)}</span>
            <p className="text-xs text-muted-foreground">Совместимость: {outfit.compatibility_score}%</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {outfit.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center rounded-lg border p-3">
              <div className="h-20 w-20 overflow-hidden rounded-lg">
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              </div>
              <p className="mt-2 line-clamp-1 text-center text-xs font-medium">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">{item.brand}</p>
              <p className="text-xs font-semibold">{formatPrice(item.price, item.currency)}</p>
            </div>
          ))}
        </div>

        {outfit.explanation && (
          <p className="mt-4 text-sm text-muted-foreground">{outfit.explanation}</p>
        )}

        <div className="mt-5 flex gap-3">
          <Button variant="coral" className="flex-1" onClick={() => addOutfit(outfit.items)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> Купить всё
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
            {copied ? "Скопировано!" : "Поделиться"}
          </Button>
        </div>
      </div>
    </div>
  )
}
