import { useState, useEffect, useCallback } from "react"
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, RefreshCw, Loader2, Sparkles, ShoppingBag, Shirt, Settings, Info, TrendingUp, Palette, CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { api } from "@/api/client"
import { useAuth } from "@/store/auth"
import { useProfile } from "@/store/profile"
import { useCart } from "@/store/cart"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils"
import type { DailyOutfit } from "@/api/types"

/* ---------- Weather helpers ---------- */

function WeatherIcon({ summary, className = "h-8 w-8" }: { summary: string; className?: string }) {
  const l = summary.toLowerCase()
  if (l.includes("снег") || l.includes("snow")) return <CloudSnow className={`${className} text-blue-300`} />
  if (l.includes("дожд") || l.includes("rain") || l.includes("ливень")) return <CloudRain className={`${className} text-blue-500`} />
  if (l.includes("облач") || l.includes("cloud") || l.includes("пасмурн")) return <Cloud className={`${className} text-gray-400`} />
  if (l.includes("ветер") || l.includes("wind")) return <Wind className={`${className} text-teal-500`} />
  return <Sun className={`${className} text-amber-500`} />
}

function tempColor(t: number): string {
  if (t <= 0) return "text-blue-500"
  if (t <= 10) return "text-sky-500"
  if (t <= 20) return "text-emerald-500"
  if (t <= 28) return "text-amber-500"
  return "text-red-500"
}

function weatherTip(_summary: string, temp: number | null | undefined): string {
  if (temp == null) return ""
  if (temp <= 0) return "Морозно — рекомендуем тёплую верхнюю одежду и многослойность"
  if (temp <= 10) return "Прохладно — лёгкая куртка или свитер будут кстати"
  if (temp <= 20) return "Комфортная температура — подойдёт лёгкий повседневный стиль"
  if (temp <= 28) return "Тепло — лёгкие ткани и открытые модели"
  return "Жарко — минимум слоёв, дышащие материалы"
}

/* ---------- Score explanation ---------- */

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 85) return { text: "Идеально", color: "text-emerald-600" }
  if (score >= 70) return { text: "Хорошо", color: "text-foreground" }
  if (score >= 50) return { text: "Нормально", color: "text-amber-500" }
  return { text: "Можно лучше", color: "text-muted-foreground" }
}

/* ---------- Main component ---------- */

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
      addToCart(item.product)
    }
    toast({ title: "Все товары добавлены в корзину" })
  }, [data, addToCart, toast])

  const handleQuickTryOn = useCallback(async (productId: string) => {
    try {
      await api.profile.quickTryOn(productId)
      navigate("/tryon")
      toast({ title: "Примерка запущена" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    }
  }, [navigate, toast])

  /* ---------- Empty states ---------- */

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
  const score = Math.round(outfit.compatibility_score)
  const sl = scoreLabel(score)
  const tip = weatherTip(weather_summary, temperature_c)

  /* ---------- Main render ---------- */

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

      {/* ========== Weather card — detailed ========== */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Temperature big display */}
            <div className="flex flex-col items-center justify-center bg-linear-to-br from-amber-50 to-sky-50 px-6 py-5 dark:from-amber-950/20 dark:to-sky-950/20">
              <WeatherIcon summary={weather_summary} className="mb-1 h-10 w-10" />
              {temperature_c != null && (
                <span className={`text-3xl font-bold tabular-nums ${tempColor(temperature_c)}`}>
                  {Math.round(temperature_c)}°
                </span>
              )}
            </div>

            {/* Weather details */}
            <div className="flex flex-1 flex-col justify-center gap-2 px-5 py-4">
              <p className="text-sm font-semibold capitalize">{weather_summary || "Погода не определена"}</p>

              {temperature_c != null && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5" />
                    {temperature_c}°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5" />
                    {temperature_c > 20 ? "Лёгкие ткани" : temperature_c > 10 ? "Средний слой" : "Тёплая одежда"}
                  </span>
                </div>
              )}

              {tip && (
                <p className="text-xs text-muted-foreground/80">{tip}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== Compatibility score — explained ========== */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold">Как подобран образ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-bold ${sl.color}`}>{score}%</span>
              <span className={`text-xs font-medium ${sl.color}`}>{sl.text}</span>
            </div>
          </div>

          {/* Score bar */}
          <Progress value={score} className="mb-3 h-2" indicatorClassName="bg-foreground" />

          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
              <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <div>
                <p className="font-medium">Цветовая сочетаемость</p>
                <p className="text-muted-foreground">Цвета вещей подобраны по теории цвета (HSL-анализ, нейтральные + комплементарные)</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <div>
                <p className="font-medium">Стилевая связность</p>
                <p className="text-muted-foreground">Все вещи в образе соответствуют одному стилевому направлению</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          {outfit.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {outfit.badges.map((b) => (
                <Badge key={b} variant="secondary" className="gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  {b}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== Outfit items ========== */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5">
          <h3 className="mb-3 text-sm font-semibold">Состав образа</h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {outfit.items.map((item) => (
              <Card key={item.product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted/50">
                  <img
                    src={item.product.image_url || undefined}
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
                  <Badge variant="outline" className="mb-1 text-[9px] uppercase">{item.role}</Badge>
                  <p className="truncate text-xs font-medium">{item.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.product.brand}</p>
                  <p className="mt-0.5 text-xs font-bold text-foreground">
                    {formatPrice(item.product.promo_price || item.product.price, item.product.currency)}
                  </p>
                  {hasPhotos() && (
                    <button
                      onClick={() => handleQuickTryOn(item.product.id)}
                      className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-accent px-2 py-1 text-[10px] font-medium transition-colors hover:bg-foreground hover:text-background"
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
              <p className="text-xs text-muted-foreground">Итого за образ</p>
              <p className="text-xl font-bold">{formatPrice(outfit.total_price)}</p>
            </div>
            <Button variant="coral" onClick={handleBuyAll}>
              <ShoppingBag className="mr-1.5 h-4 w-4" /> Купить весь образ
            </Button>
          </div>

          {outfit.explanation && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{outfit.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
