import { Heart, Trash2, Shirt, ShoppingCart } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useWishlist } from "@/store/wishlist"
import { useCart } from "@/store/cart"
import { useNavigation } from "@/store/navigation"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"

export function WishlistPage() {
  const navigate = useNavigate()
  const { items, remove } = useWishlist()
  const addItem = useCart((s) => s.addItem)
  const setTryOnProducts = useNavigation((s) => s.setTryOnProducts)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Избранное</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
          <Heart className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium">Пока пусто</p>
          <p className="mt-1 text-sm text-muted-foreground">Нажмите на сердечко на карточке товара чтобы добавить</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          Избранное <span className="text-muted-foreground font-normal text-lg">({items.length})</span>
        </h1>
        <Button
          variant="coral"
          size="sm"
          onClick={() => {
            const products = items.map((p) => ({
              ...p, sku_id: "", subcategory: "", gender: "unisex" as const,
              description: "", color: "", pattern: "", fit: "", material: "",
              currency: p.currency || "USD", sizes: [], style_tags: [], occasion_tags: [],
              season: "all", seller_id: "",
            }))
            setTryOnProducts(products.slice(0, 5))
            navigate("/tryon")
          }}
          disabled={items.length === 0}
        >
          <Shirt className="mr-1.5 h-3.5 w-3.5" />
          Примерить всё ({Math.min(items.length, 5)})
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <div key={product.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="aspect-square overflow-hidden bg-muted/50">
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
            <div className="p-3 space-y-1">
              <p className="text-xs text-muted-foreground">{product.brand}</p>
              <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
              <p className="text-sm font-semibold">{formatPrice(product.price, product.currency)}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="coral" className="flex-1 text-xs" onClick={() => addItem(product)}>
                  <ShoppingCart className="mr-1 h-3 w-3" /> В корзину
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => remove(product.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
