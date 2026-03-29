import { useState, useMemo } from "react"
import {
  X,
  ShoppingCart,
  Shirt,
  Trophy,
  DollarSign,
  Star,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatPrice } from "@/lib/utils"
import type { Outfit, ProductBrief } from "@/api/types"

interface OutfitComparisonProps {
  outfits: Outfit[]
  onClose: () => void
  onBuyAll: (items: ProductBrief[]) => void
  onTryOnOutfit: (outfit: Outfit) => void
}

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-green-500"
  if (score >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Отличная"
  if (score >= 50) return "Хорошая"
  return "Низкая"
}

export function OutfitComparison({
  outfits: initialOutfits,
  onClose,
  onBuyAll,
  onTryOnOutfit,
}: OutfitComparisonProps) {
  const [outfits, setOutfits] = useState<Outfit[]>(initialOutfits)

  const removeOutfit = (id: string) => {
    const next = outfits.filter((o) => o.id !== id)
    if (next.length < 2) {
      onClose()
      return
    }
    setOutfits(next)
  }

  const summary = useMemo(() => {
    if (outfits.length < 2) return null

    const cheapest = outfits.reduce((a, b) =>
      a.total_price <= b.total_price ? a : b
    )
    const bestScore = outfits.reduce((a, b) =>
      a.compatibility_score >= b.compatibility_score ? a : b
    )

    // Find common product IDs across all outfits
    const productIdSets = outfits.map(
      (o) => new Set(o.items.map((i) => i.product.id))
    )
    const commonIds = [...productIdSets[0]].filter((id) =>
      productIdSets.every((s) => s.has(id))
    )
    const commonItems: ProductBrief[] = commonIds.map((id) => {
      const item = outfits[0].items.find((i) => i.product.id === id)!
      return item.product
    })

    return { cheapest, bestScore, commonItems }
  }, [outfits])

  if (outfits.length < 2) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-bold">
            Сравнение образов{" "}
            <span className="text-muted-foreground font-normal">
              ({outfits.length})
            </span>
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Comparison grid */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div
          className="mx-auto grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${outfits.length}, minmax(0, 1fr))`,
            maxWidth: outfits.length === 2 ? "800px" : "1100px",
          }}
        >
          {outfits.map((outfit, colIdx) => {
            const isCheapest = summary?.cheapest.id === outfit.id
            const isBestScore = summary?.bestScore.id === outfit.id

            return (
              <div
                key={outfit.id}
                className="animate-fade-in-up relative flex flex-col rounded-xl border bg-card shadow-sm"
                style={{ animationDelay: `${colIdx * 80}ms` }}
              >
                {/* Winner badges */}
                {(isCheapest || isBestScore) && (
                  <div className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                    {isCheapest && (
                      <Badge
                        variant="coral"
                        className="flex items-center gap-1 text-[10px] shadow-sm"
                      >
                        <DollarSign className="h-3 w-3" />
                        Выгоднее
                      </Badge>
                    )}
                    {isBestScore && (
                      <Badge className="flex items-center gap-1 bg-green-500/10 text-[10px] text-green-600 shadow-sm">
                        <Trophy className="h-3 w-3" />
                        Лучший стиль
                      </Badge>
                    )}
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeOutfit(outfit.id)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-muted p-1 text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
                  title="Убрать из сравнения"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Style & occasion */}
                <div className="space-y-3 p-5 pt-6">
                  <div className="flex flex-wrap gap-1.5">
                    {outfit.badges.map((badge) => (
                      <Badge
                        key={badge}
                        variant="coral"
                        className="text-[10px]"
                      >
                        {badge}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-[10px]">
                      {outfit.style}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {outfit.occasion}
                    </Badge>
                  </div>

                  {/* Product images vertical stack */}
                  <div className="space-y-2">
                    {outfit.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="group/item relative flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg shadow-sm">
                          <img
                            src={item.product.image_url || undefined}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              target.parentElement!.innerHTML = `<div class="h-full w-full rounded-lg" style="background-color: ${item.product.color_hex || "#ccc"}"></div>`
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.product.brand}
                          </p>
                          <div className="flex items-center gap-2">
                            {item.product.promo_price ? (
                              <>
                                <span className="text-sm font-semibold text-foreground">
                                  {formatPrice(item.product.promo_price)}
                                </span>
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(item.product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold">
                                {formatPrice(item.product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className="h-5 w-5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.product.color_hex || "#ccc" }}
                          title={item.product.color_name}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Compatibility score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {getScoreLabel(outfit.compatibility_score)} совместимость
                      </span>
                      <span className="font-bold">
                        {outfit.compatibility_score}%
                      </span>
                    </div>
                    <Progress
                      value={outfit.compatibility_score}
                      className="h-2"
                      indicatorClassName={getScoreColor(
                        outfit.compatibility_score
                      )}
                    />
                  </div>

                  {/* Explanation */}
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {outfit.explanation}
                  </p>

                  {/* Total price */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">Итого</span>
                    <span className="text-xl font-bold">
                      {formatPrice(outfit.total_price)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 border-t p-4">
                  <Button
                    variant="coral"
                    className="w-full"
                    onClick={() =>
                      onBuyAll(outfit.items.map((i) => i.product))
                    }
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Купить всё
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onTryOnOutfit(outfit)}
                  >
                    <Shirt className="mr-2 h-4 w-4" />
                    Примерить ({outfit.items.length})
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison summary row */}
        {summary && (
          <div className="animate-fade-in-up mx-auto mt-8 max-w-275 rounded-xl border bg-muted/30 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Star className="h-4 w-4 text-foreground" />
              Сводка сравнения
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Cheapest */}
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5 text-foreground" />
                  Самый выгодный
                </div>
                <p className="text-sm font-semibold">
                  {formatPrice(summary.cheapest.total_price)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.cheapest.badges[0] || summary.cheapest.style}
                </p>
              </div>

              {/* Best score */}
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-green-500" />
                  Лучшая совместимость
                </div>
                <p className="text-sm font-semibold">
                  {summary.bestScore.compatibility_score}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.bestScore.badges[0] || summary.bestScore.style}
                </p>
              </div>

              {/* Common items */}
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  Общие товары
                </div>
                {summary.commonItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {summary.commonItems.map((item) => (
                      <Badge
                        key={item.id}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Нет совпадающих товаров
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Floating compare button - use alongside outfit lists                */
/* ------------------------------------------------------------------ */

interface FloatingCompareButtonProps {
  selectedCount: number
  onClick: () => void
}

export function FloatingCompareButton({
  selectedCount,
  onClick,
}: FloatingCompareButtonProps) {
  if (selectedCount < 2) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <Button
        variant="coral"
        size="lg"
        className="gap-2 rounded-full px-6 shadow-lg"
        onClick={onClick}
      >
        <Layers className="h-4 w-4" />
        Сравнить
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold">
          {selectedCount}
        </span>
      </Button>
    </div>
  )
}
