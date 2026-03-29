import { useState, useEffect, useCallback } from "react"
import { Sun, Cloud, CloudRain, Thermometer, RefreshCw, Loader2, Sparkles, ShoppingBag, Shirt, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/api/client"
import { useAuth } from "@/store/auth"
import { useProfile } from "@/store/profile"
import { useCart } from "@/store/cart"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils"
import type { DailyOutfit } from "@/api/types"

function WeatherIcon({ summary }: { summary: string }) {
  const lower = summary.toLowerCase()
  if (lower.includes("дожд") || lower.includes("rain")) return <CloudRain className="h-5 w-5 text-blue-500" />
  if (lower.includes("облач") || lower.includes("cloud") || lower.includes("пасмурн")) return <Cloud className="h-5 w-5 text-gray-400" />
  return <Sun className="h-5 w-5 text-amber-500" />
}

export function DailyOutfitPage() {
  const navigate = useNavigate()
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const hasPhotos = useProfile((s) => s.hasPhotos)
  const addToCart = useCart((s) => s.addItem)
  const { toast } = useToast()
  const [data, setData] = useState<DailyOutfit | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState("")

  const fetchToday = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await api.dailyOutfit.getToday()
      setData(result)
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить образ дня")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn()) fetchToday()
    else setLoading(false)
  }, [isLoggedIn, fetchToday])

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true)
    try {
      const result = await api.dailyOutfit.regenerate()
      setData(result)
      toast({ title: "Новый образ сгенерирован" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    } finally {
      setRegenerating(false)
    }
  }, [toast])

  const handleBuyAll = useCallback(() => {
    if (!data) return
    for (const item of data.outfit.items) {
      addToCart({
        id: item.product.id,
        name: item.product.name,
        price: item.product.promo_price || item.product.price,
        image_url: item.product.image_url,
        color_hex: item.product.color_hex,
      })
    }
    toast({ title: "Все товары добавлены в корзину" })
  }, [data, addToCart, toast])

  const handleQuickTryOn = useCallback(async (productId: string) => {
    try {
      const job = await api.profile.quickTryOn(productId)
      navigate(`/tryon`)
      toast({ title: "Примерка запущена" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    }
  }, [navigate, toast])

  if (!isLoggedIn()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Sun className="mx-auto mb-4 h-12 w-12 text-amber-500/50" />
        <h2 className="text-xl font-bold">Образ дня</h2>
        <p className="mt-2 text-muted-foreground">Войдите в аккаунт, чтобы получать персональные рекомендации</p>
        <Button variant="coral" className="mt-4" onClick={() => navigate("/auth")}>Войти</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-bold">Настройте предпочтения</h2>
        <p className="mt-2 text-muted-foreground">
          Укажите стиль, пол и город в профиле — и мы будем подбирать образ дня с учётом погоды
        </p>
        <Button variant="coral" className="mt-4" onClick={() => navigate("/profile")}>
          <Settings className="mr-1.5 h-4 w-4" /> Настроить профиль
        </Button>
      </div>
    )
  }

  if (!data) return null
  const { outfit, weather_summary, temperature_c, date } = data

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30">
            <Sun className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Образ дня</h1>
            <p className="text-sm text-muted-foreground">{date}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
          Обновить
        </Button>
      </div>

      {/* Weather card */}
      {weather_summary && (
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 py-4">
            <WeatherIcon summary={weather_summary} />
            <div>
              <p className="text-sm font-medium capitalize">{weather_summary}</p>
              {temperature_c !== null && temperature_c !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Thermometer className="h-3.5 w-3.5" />
                  <span>{temperature_c}°C</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outfit */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5">
          {/* Score & badges */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/10">
              <span className="text-lg font-bold text-coral">{Math.round(outfit.compatibility_score)}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">Совместимость образа</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {outfit.badges.map((b) => (
                  <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {outfit.items.map((item) => (
              <Card key={item.product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted/50">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-16 w-16 rounded-full shadow-inner" style="background-color: ${item.product.color_hex || '#ccc'}"></div></div>`
                    }}
                  />
                </div>
                <CardContent className="p-2.5">
                  <p className="truncate text-xs font-medium">{item.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.product.brand}</p>
                  <p className="mt-0.5 text-xs font-bold text-coral">
                    {formatPrice(item.product.promo_price || item.product.price, item.product.currency)}
                  </p>
                  {hasPhotos() && (
                    <button
                      onClick={() => handleQuickTryOn(item.product.id)}
                      className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-accent px-2 py-1 text-[10px] font-medium transition-colors hover:bg-coral hover:text-white"
                    >
                      <Shirt className="h-3 w-3" /> Примерить
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Total & actions */}
          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Итого</p>
              <p className="text-lg font-bold">{formatPrice(outfit.total_price)}</p>
            </div>
            <Button variant="coral" onClick={handleBuyAll}>
              <ShoppingBag className="mr-1.5 h-4 w-4" /> Купить весь образ
            </Button>
          </div>

          {outfit.explanation && (
            <p className="mt-3 text-xs text-muted-foreground">{outfit.explanation}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
