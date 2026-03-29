import { Sparkles, ShoppingBag, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, Plus, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/store/cart"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils"
import type { CapsuleAnalysis as CapsuleAnalysisType } from "@/api/types"

const CAT_LABELS: Record<string, string> = {
  tops: "Верх", bottoms: "Низ", dresses: "Платья",
  outerwear: "Верхняя одежда", shoes: "Обувь", accessories: "Аксессуары",
}

interface Props {
  analysis: CapsuleAnalysisType
}

export function CapsuleAnalysis({ analysis }: Props) {
  const addToCart = useCart((s) => s.addItem)
  const { toast } = useToast()

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.promo_price || product.price,
      image_url: product.image_url,
      color_hex: product.color_hex,
    })
    toast({ title: "Добавлено в корзину", description: product.name })
  }

  const totalNewOutfits = analysis.recommendation_insights.reduce(
    (sum, r) => sum + r.new_outfits_count, 0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Анализ вашего гардероба
          </h2>
          <p className="text-sm text-muted-foreground">На основе AI-анализа ваших вещей</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-5 text-center">
            <span className="text-3xl font-bold">{analysis.total_items}</span>
            <span className="mt-1 text-xs text-muted-foreground">вещей в гардеробе</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-5 text-center">
            <span className="text-3xl font-bold">{analysis.current_outfits_count}</span>
            <span className="mt-1 text-xs text-muted-foreground">возможных образов</span>
          </CardContent>
        </Card>
        <Card className="border-foreground/20">
          <CardContent className="flex flex-col items-center py-5 text-center">
            <span className="text-3xl font-bold text-emerald-600">+{totalNewOutfits}</span>
            <span className="mt-1 text-xs text-muted-foreground">новых с покупками</span>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      <Card>
        <CardContent className="py-5">
          <p className="text-sm leading-relaxed">{analysis.analysis_text}</p>
        </CardContent>
      </Card>

      {/* Missing categories */}
      {analysis.missing_categories.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Чего не хватает</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.missing_categories.map((cat) => (
              <Badge key={cat} variant="outline" className="border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs">
                {CAT_LABELS[cat] || cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation cards with marketing hooks */}
      {analysis.gap_recommendations.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Рекомендуем купить</h3>
          </div>

          <div className="space-y-3">
            {analysis.gap_recommendations.map((product, idx) => {
              const insight = analysis.recommendation_insights.find(
                (r) => r.product_id === product.id
              )

              return (
                <Card key={product.id} className="overflow-hidden transition-all duration-300 hover:shadow-md animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <CardContent className="flex items-stretch gap-4 p-0">
                    {/* Product image */}
                    <div className="w-24 shrink-0 bg-muted/30 sm:w-32">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-12 w-12 rounded-full" style="background-color: ${product.color_hex || '#ccc'}"></div></div>`
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-center gap-2 py-4 pr-4">
                      {/* Marketing hook — big and bold */}
                      {insight?.marketing_hook && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="text-sm font-bold text-emerald-600">
                            {insight.marketing_hook}
                          </span>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                      </div>

                      {/* Reason */}
                      {insight?.reason && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {insight.reason}
                        </p>
                      )}

                      {/* Pairs with */}
                      {insight?.pairs_with && insight.pairs_with.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                          <span>Сочетается с:</span>
                          {insight.pairs_with.slice(0, 3).map((name) => (
                            <Badge key={name} variant="secondary" className="text-[9px] px-1.5 py-0">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">
                          {formatPrice(product.price, product.currency)}
                        </span>
                        <Button
                          variant="coral"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleAddToCart(product)}
                        >
                          <ShoppingBag className="mr-1 h-3 w-3" />
                          В корзину
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Style tips */}
      {analysis.style_tips.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Советы стилиста</h3>
          </div>
          <Card>
            <CardContent className="py-4">
              <ul className="space-y-2">
                {analysis.style_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Possible outfits from current wardrobe */}
      {analysis.possible_outfits.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">
            Образы из вашего гардероба ({analysis.current_outfits_count})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {analysis.possible_outfits.slice(0, 6).map((outfit) => (
              <Card key={outfit.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">{Math.round(outfit.compatibility_score)}%</span>
                    <div className="flex gap-1">
                      {outfit.badges.slice(0, 1).map((b) => (
                        <Badge key={b} variant="secondary" className="text-[8px]">{b}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {outfit.items.map((item) => (
                      <div
                        key={item.product.id}
                        className="h-10 w-10 rounded-md border"
                        style={{ backgroundColor: item.product.color_hex || "#ccc" }}
                        title={item.product.name}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
