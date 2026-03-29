import { Sparkles, ShoppingBag, AlertTriangle, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import type { CapsuleAnalysis as CapsuleAnalysisType, Product } from "@/api/types"

const CAT_LABELS: Record<string, string> = {
  tops: "Верх", bottoms: "Низ", dresses: "Платья",
  outerwear: "Верхняя одежда", shoes: "Обувь", accessories: "Аксессуары",
}

interface Props {
  analysis: CapsuleAnalysisType
  onAddToWardrobe?: (product: Product) => void
}

export function CapsuleAnalysis({ analysis, onAddToWardrobe }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-coral" />
        <h2 className="text-xl font-bold">Анализ капсулы</h2>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm leading-relaxed">{analysis.analysis_text}</p>
        </CardContent>
      </Card>

      {/* Missing categories */}
      {analysis.missing_categories.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Не хватает для полноценных образов</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.missing_categories.map((cat) => (
              <Badge key={cat} variant="outline" className="border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                {CAT_LABELS[cat] || cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Gap recommendations */}
      {analysis.gap_recommendations.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-coral" />
            <h3 className="font-semibold">Рекомендуем добавить</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Эти товары подобраны по цветовой совместимости с вашим гардеробом
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {analysis.gap_recommendations.map((product) => (
              <Card key={product.id} className="flex items-center gap-3 p-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-lg border"
                  style={{ backgroundColor: product.color_hex || "#ccc" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                  <p className="text-xs font-semibold text-coral">{formatPrice(product.price, product.currency)}</p>
                </div>
                {onAddToWardrobe && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onAddToWardrobe(product as any)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Possible outfits */}
      {analysis.possible_outfits.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Возможные образы из вашего гардероба ({analysis.possible_outfits.length})</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.possible_outfits.map((outfit) => (
              <Card key={outfit.id} className="overflow-hidden">
                <CardContent className="pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-semibold">{Math.round(outfit.compatibility_score)}% совместимость</span>
                    <div className="flex flex-wrap gap-1">
                      {outfit.badges.map((badge) => (
                        <Badge key={badge} variant="secondary" className="text-[10px]">{badge}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {outfit.items.map((item) => (
                      <div key={item.product.id} className="flex flex-col items-center">
                        <div
                          className="h-12 w-12 rounded-lg border"
                          style={{ backgroundColor: item.product.color_hex || "#ccc" }}
                        />
                        <span className="mt-1 max-w-14 truncate text-center text-[9px] text-muted-foreground">
                          {item.role}
                        </span>
                      </div>
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
