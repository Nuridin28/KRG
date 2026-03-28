import { Bot, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import type { ChatMessage as ChatMessageType, ProductBrief, Outfit } from "@/api/types"

interface ChatMessageProps {
  message: ChatMessageType
  products?: ProductBrief[]
  outfits?: Outfit[]
  isTyping?: boolean
}

function MiniProductCard({ product }: { product: ProductBrief }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-2">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
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
      </div>
      <span className="shrink-0 text-xs font-semibold">{formatPrice(product.price)}</span>
    </div>
  )
}

function MiniOutfitCard({ outfit }: { outfit: Outfit }) {
  return (
    <div className="rounded-md border bg-background p-3">
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
            <div className="h-8 w-8 overflow-hidden rounded-md">
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
            <span className="mt-0.5 text-[9px] text-muted-foreground">{item.role}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{outfit.explanation}</p>
    </div>
  )
}

export function ChatMessageComponent({
  message,
  products = [],
  outfits = [],
  isTyping = false,
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

      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : ""}`}>
        <div
          className={`rounded-lg px-4 py-2.5 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {products.length > 0 && (
          <div className="space-y-1.5">
            {products.slice(0, 4).map((product) => (
              <MiniProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {outfits.length > 0 && (
          <div className="space-y-2">
            {outfits.slice(0, 2).map((outfit) => (
              <MiniOutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
