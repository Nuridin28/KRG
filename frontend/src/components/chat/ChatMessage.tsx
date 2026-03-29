import { useState } from "react"
import { Bot, User, ShoppingCart, Shirt, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/store/cart"
import type { ChatMessage as ChatMessageType, ProductBrief, Outfit, CategoryType } from "@/api/types"

const CATEGORY_LABELS: Record<CategoryType, string> = {
  tops: "Верх",
  bottoms: "Низ",
  outerwear: "Верхняя одежда",
  dresses: "Платья",
  shoes: "Обувь",
  accessories: "Аксессуары",
}

const CATEGORY_ORDER: CategoryType[] = ["tops", "outerwear", "bottoms", "dresses", "shoes", "accessories"]

function groupByCategory(products: ProductBrief[]): { category: CategoryType; label: string; items: ProductBrief[] }[] {
  const map = new Map<CategoryType, ProductBrief[]>()
  for (const p of products) {
    const cat = p.category
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(p)
  }
  return CATEGORY_ORDER
    .filter((cat) => map.has(cat))
    .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: map.get(cat)! }))
}

interface ChatMessageProps {
  message: ChatMessageType
  products?: ProductBrief[]
  outfits?: Outfit[]
  isTyping?: boolean
  onTryOnProduct?: (product: ProductBrief) => void
  onTryOnOutfit?: (outfit: Outfit) => void
}

function MiniProductCard({
  product,
  onTryOn,
}: {
  product: ProductBrief
  onTryOn?: (product: ProductBrief) => void
}) {
  const addItem = useCart((s) => s.addItem)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-2.5">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            target.parentElement!.innerHTML = `<div class="h-full w-full rounded-full" style="background-color: ${product.color_hex || '#ccc'}"></div>`
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{product.name}</p>
        <p className="text-[10px] text-muted-foreground">{product.brand}</p>
        <span className="text-xs font-semibold">{formatPrice(product.price, product.currency)}</span>
      </div>
      <div className="flex shrink-0 gap-1">
        {onTryOn && (
          <button
            onClick={() => onTryOn(product)}
            className="flex h-7 w-7 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-coral hover:text-coral"
            title="Примерить"
          >
            <Shirt className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleAdd}
          disabled={added}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            added
              ? "bg-green-500 text-white"
              : "border text-muted-foreground hover:border-coral hover:bg-coral hover:text-white"
          }`}
          title={added ? "Добавлено" : "В корзину"}
        >
          {added ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

function MiniOutfitCard({
  outfit,
  onTryOnOutfit,
}: {
  outfit: Outfit
  onTryOnOutfit?: (outfit: Outfit) => void
}) {
  const addOutfit = useCart((s) => s.addOutfit)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addOutfit(outfit.items.map((i) => i.product))
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1">
          {outfit.badges.slice(0, 2).map((b) => (
            <Badge key={b} variant="coral" className="text-[9px]">
              {b}
            </Badge>
          ))}
        </div>
        <span className="text-xs font-bold">{formatPrice(outfit.total_price)}</span>
      </div>
      <div className="flex gap-2">
        {outfit.items.map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-10 w-10 overflow-hidden rounded-lg">
              <img
                src={item.product.image_url}
                alt={item.product.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  target.parentElement!.innerHTML = `<div class="h-full w-full rounded-full" style="background-color: ${item.product.color_hex || '#ccc'}"></div>`
                }}
              />
            </div>
            <span className="mt-0.5 max-w-12 truncate text-[9px] text-muted-foreground">{item.product.name}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{outfit.explanation}</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleAdd}
          disabled={added}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
            added
              ? "bg-green-500 text-white"
              : "bg-coral text-white hover:bg-coral/90"
          }`}
        >
          {added ? <Check className="h-3 w-3" /> : <ShoppingCart className="h-3 w-3" />}
          {added ? "Добавлено!" : "Купить всё"}
        </button>
        {onTryOnOutfit && (
          <button
            onClick={() => onTryOnOutfit(outfit)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-medium transition-colors hover:border-coral hover:text-coral"
          >
            <Shirt className="h-3 w-3" />
            Примерить
          </button>
        )}
      </div>
    </div>
  )
}

export function ChatMessageComponent({
  message,
  products = [],
  outfits = [],
  isTyping = false,
  onTryOnProduct,
  onTryOnOutfit,
}: ChatMessageProps) {
  const isUser = message.role === "user"

  if (isTyping) {
    return (
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-lg bg-muted px-4 py-3">
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary" : "bg-muted"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : ""}`}>
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {products.length > 0 && (
          <div className="space-y-3">
            {groupByCategory(products.slice(0, 12)).map((group) => (
              <div key={group.category}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1.5">
                  {group.items.map((product) => (
                    <MiniProductCard
                      key={product.id}
                      product={product}
                      onTryOn={onTryOnProduct}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {outfits.length > 0 && (
          <div className="space-y-2">
            {outfits.slice(0, 3).map((outfit) => (
              <MiniOutfitCard
                key={outfit.id}
                outfit={outfit}
                onTryOnOutfit={onTryOnOutfit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
