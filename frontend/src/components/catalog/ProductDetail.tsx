import { useState, useEffect } from "react"
import { ShoppingCart, Sparkles, Shirt, Loader2, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/store/cart"
import { api } from "@/api/client"
import type { Product, ProductBrief } from "@/api/types"

interface ProductDetailProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBuildOutfit: (product: Product) => void
  onTryOn: (product: Product) => void
}

export function ProductDetail({
  product,
  open,
  onOpenChange,
  onBuildOutfit,
  onTryOn,
}: ProductDetailProps) {
  const addItem = useCart((s) => s.addItem)
  const [recommendations, setRecommendations] = useState<ProductBrief[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (product && open) {
      setAdded(false)
      setLoadingRecs(true)
      api.outfits
        .recommend(product.id)
        .then(setRecommendations)
        .catch(() => setRecommendations([]))
        .finally(() => setLoadingRecs(false))
    }
  }, [product, open])

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription>{product.brand}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-lg bg-muted/50">
            <img
              src={product.image_url || undefined}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
                target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-40 w-40 rounded-full shadow-lg" style="background-color: ${product.color_hex || '#ccc'}"></div></div>`
              }}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              {product.promo_price ? (
                <>
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(product.promo_price, product.currency)}
                  </span>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.price, product.currency)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold">
                  {formatPrice(product.price, product.currency)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full border"
                style={{ backgroundColor: product.color_hex || "#ccc" }}
              />
              <span className="text-sm">{product.color_name}</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Размеры</p>
              <div className="flex flex-wrap gap-1.5">
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    className="flex h-8 w-10 items-center justify-center rounded border text-xs font-medium"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Материал:</span> {product.material}
              </p>
              <p>
                <span className="text-muted-foreground">Посадка:</span> {product.fit}
              </p>
              <p>
                <span className="text-muted-foreground">Паттерн:</span> {product.pattern}
              </p>
              <p>
                <span className="text-muted-foreground">Сезон:</span> {product.season}
              </p>
            </div>

            {product.style_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.style_tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{product.description}</p>

        <div className="space-y-2">
          <Button
            variant={added ? "outline" : "coral"}
            className={`w-full transition-all ${added ? "border-green-500 text-green-600" : ""}`}
            disabled={added}
            onClick={() => {
              addItem({
                id: product.id,
                name: product.name,
                brand: product.brand,
                category: product.category,
                color_hex: product.color_hex,
                color_name: product.color_name,
                price: product.price,
                promo_price: product.promo_price,
                image_url: product.image_url,
                in_stock: product.in_stock,
              })
              setAdded(true)
              setTimeout(() => onOpenChange(false), 800)
            }}
          >
            {added ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Добавлено!
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                В корзину
              </>
            )}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onBuildOutfit(product)
                onOpenChange(false)
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Собрать образ
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onTryOn(product)
                onOpenChange(false)
              }}
            >
              <Shirt className="mr-2 h-4 w-4" />
              Примерить
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-3 text-sm font-semibold">Похожие товары</h4>
          {loadingRecs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {recommendations.slice(0, 4).map((rec) => (
                <div key={rec.id} className="space-y-1 text-center">
                  <div className="aspect-square overflow-hidden rounded-md bg-muted/50">
                    <img
                      src={rec.image_url || undefined}
                      alt={rec.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                        target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-10 w-10 rounded-full" style="background-color: ${rec.color_hex || '#ccc'}"></div></div>`
                      }}
                    />
                  </div>
                  <p className="line-clamp-1 text-xs font-medium">{rec.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(rec.price)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Рекомендации не найдены
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
