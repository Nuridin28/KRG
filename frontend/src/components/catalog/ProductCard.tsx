import { Shirt } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import type { Product } from "@/api/types"

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
  onTryOn: (product: Product) => void
}

export function ProductCard({ product, onSelect, onTryOn }: ProductCardProps) {
  return (
    <Card className="group flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative shrink-0" onClick={() => onSelect(product)}>
        <div className="aspect-square overflow-hidden bg-muted/50">
          <img
            src={product.image_url}
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
              <span className="text-sm font-bold text-coral">
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

      <CardFooter className="mt-auto border-t p-3">
        <Button
          size="sm"
          variant="coral"
          className="w-full text-xs"
          onClick={(e) => {
            e.stopPropagation()
            onTryOn(product)
          }}
        >
          <Shirt className="mr-1.5 h-3.5 w-3.5" />
          Примерить
        </Button>
      </CardFooter>
    </Card>
  )
}
