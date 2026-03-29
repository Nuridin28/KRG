import { useState, useCallback } from "react"
import { Shirt, Check, Heart, Zap, Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { useWishlist } from "@/store/wishlist"
import { useProfile } from "@/store/profile"
import { useWardrobe } from "@/store/wardrobe"
import { useAuth } from "@/store/auth"
import { api } from "@/api/client"
import { useToast } from "@/hooks/use-toast"
import type { Product } from "@/api/types"

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
  onTryOn: (product: Product) => void
  tryOnSelected?: boolean
  onToggleTryOn?: (product: Product) => void
  onQuickTryOn?: (jobId: string) => void
}

export function ProductCard({ product, onSelect, onTryOn, tryOnSelected, onToggleTryOn, onQuickTryOn }: ProductCardProps) {
  const wishlist = useWishlist()
  const isWished = wishlist.has(product.id)
  const hasPhotos = useProfile((s) => s.hasPhotos)
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const inWardrobe = useWardrobe((s) => s.hasProduct(product.id))
  const wardrobeAdd = useWardrobe((s) => s.addItem)
  const { toast } = useToast()
  const [quickLoading, setQuickLoading] = useState(false)
  const [wardrobeLoading, setWardrobeLoading] = useState(false)

  const handleQuickTryOn = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setQuickLoading(true)
    try {
      const job = await api.profile.quickTryOn(product.id)
      onQuickTryOn?.(job.job_id)
      toast({ title: "Примерка запущена", description: product.name })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    } finally {
      setQuickLoading(false)
    }
  }, [product, onQuickTryOn, toast])

  const handleAddToWardrobe = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (inWardrobe) return
    setWardrobeLoading(true)
    try {
      const item = await api.wardrobe.addItem({ product_id: product.id })
      wardrobeAdd(item)
      toast({ title: "Добавлено в гардероб", description: product.name })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    } finally {
      setWardrobeLoading(false)
    }
  }, [product, inWardrobe, wardrobeAdd, toast])

  return (
    <Card className={`group flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
      tryOnSelected ? "ring-2 ring-foreground" : ""
    }`}>
      <div className="relative shrink-0" onClick={() => onSelect(product)}>
        <div className="aspect-square overflow-hidden bg-muted/50">
          <img
            src={product.image_url || undefined}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
              target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-32 w-32 rounded-full shadow-inner" style="background-color: ${product.color_hex || '#ccc'}"></div></div>`
            }}
          />
        </div>
        {product.promo_price && (
          <Badge variant="coral" className="absolute left-2 top-2">
            Скидка
          </Badge>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="text-sm font-medium text-muted-foreground">Нет в наличии</span>
          </div>
        )}

        {/* Wishlist heart */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            wishlist.toggle({
              id: product.id, name: product.name, brand: product.brand,
              category: product.category, color_hex: product.color_hex,
              color_name: product.color_name, price: product.price,
              promo_price: product.promo_price, currency: product.currency,
              image_url: product.image_url, in_stock: product.in_stock,
            })
          }}
          className={`absolute left-2 ${product.promo_price ? "top-9" : "top-2"} flex h-7 w-7 items-center justify-center rounded-full transition-all ${
            isWished
              ? "bg-red-500 text-white"
              : "bg-black/30 text-white hover:bg-red-500"
          }`}
          title={isWished ? "Убрать из избранного" : "В избранное"}
        >
          <Heart className={`h-3.5 w-3.5 ${isWished ? "fill-current" : ""}`} />
        </button>

        {/* Try-on selection checkbox */}
        {onToggleTryOn && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTryOn(product) }}
            className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
              tryOnSelected
                ? "border-foreground bg-foreground text-background"
                : "border-white/80 bg-black/30 text-white hover:bg-foreground/80 hover:border-foreground"
            }`}
            title={tryOnSelected ? "Убрать из примерки" : "Добавить к примерке"}
          >
            {tryOnSelected ? <Check className="h-4 w-4" /> : <Shirt className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <CardContent className="flex-1 space-y-2 p-4" onClick={() => onSelect(product)}>
        <p className="text-xs text-muted-foreground">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</h3>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ backgroundColor: product.color_hex || "#ccc" }}
            title={product.color_name}
          />
          <span className="text-xs text-muted-foreground">{product.color_name}</span>
        </div>
        <div className="flex items-baseline gap-2">
          {product.promo_price ? (
            <>
              <span className="text-sm font-bold text-foreground">
                {formatPrice(product.promo_price, product.currency)}
              </span>
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.price, product.currency)}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold">
              {formatPrice(product.price, product.currency)}
            </span>
          )}
        </div>
        {product.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.style_tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto border-t p-2.5">
        <div className="flex w-full flex-col gap-1.5">
          {/* Quick try-on (if user has saved photos) */}
          {isLoggedIn() && hasPhotos() ? (
            <Button
              size="sm"
              variant="coral"
              className="w-full text-xs"
              disabled={quickLoading}
              onClick={handleQuickTryOn}
            >
              {quickLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
              Примерить на себя
            </Button>
          ) : (
            <Button
              size="sm"
              variant="coral"
              className="w-full text-xs"
              onClick={(e) => { e.stopPropagation(); onTryOn(product) }}
            >
              <Shirt className="mr-1.5 h-3.5 w-3.5" />
              Примерить
            </Button>
          )}

          {/* Add to wardrobe */}
          {isLoggedIn() && (
            <Button
              size="sm"
              variant={inWardrobe ? "secondary" : "outline"}
              className="w-full text-xs"
              disabled={inWardrobe || wardrobeLoading}
              onClick={handleAddToWardrobe}
            >
              {wardrobeLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : inWardrobe ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {inWardrobe ? "В гардеробе" : "В гардероб"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
