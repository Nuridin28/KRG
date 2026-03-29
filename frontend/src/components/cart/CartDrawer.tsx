import { useEffect } from "react"
import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCart } from "@/store/cart"
import { formatPrice } from "@/lib/utils"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart()

  // Lock body scroll when cart is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 flex w-full flex-col border-l bg-background shadow-2xl sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Корзина</h2>
            <span className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ShoppingBag className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium">Корзина пуста</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Добавьте товары из каталога или образы от AI стилиста
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-5">
            <div className="space-y-4 py-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.brand}</p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatPrice(item.product.promo_price || item.product.price)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-5 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-auto flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Итого</span>
              <span className="text-lg font-bold">{formatPrice(totalPrice())}</span>
            </div>
            <Button variant="coral" className="w-full" size="lg">
              Оформить заказ
            </Button>
            <button
              onClick={clearCart}
              className="mt-2 w-full py-1.5 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Очистить корзину
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
