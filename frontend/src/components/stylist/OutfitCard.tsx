import { useState } from "react"
import { ShoppingCart, Shirt, Share2, GitCompareArrows, Save, Check } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useCart } from "@/store/cart"
import { useAuth } from "@/store/auth"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatPrice } from "@/lib/utils"
import { ShareOutfit } from "./ShareOutfit"
import type { Outfit } from "@/api/types"

interface OutfitCardProps {
  outfit: Outfit
  onTryOnOutfit: () => void
  compareSelected?: boolean
  onToggleCompare?: (outfit: Outfit) => void
}

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-green-500"
  if (score >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Отличная совместимость"
  if (score >= 50) return "Хорошая совместимость"
  return "Низкая совместимость"
}

export function OutfitCard({ outfit, onTryOnOutfit, compareSelected, onToggleCompare }: OutfitCardProps) {
  const addOutfit = useCart((s) => s.addOutfit)
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const [shareOpen, setShareOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!isLoggedIn()) return
    try {
      await api.savedOutfits.save({
        items: outfit.items.map((i) => ({
          product_id: i.product.id, name: i.product.name, brand: i.product.brand,
          category: i.product.category, color_hex: i.product.color_hex,
          color_name: i.product.color_name, price: i.product.price,
          promo_price: i.product.promo_price, currency: i.product.currency || "USD",
          image_url: i.product.image_url, role: i.role,
        })),
        style: outfit.style, occasion: outfit.occasion,
        total_price: outfit.total_price, compatibility_score: outfit.compatibility_score,
        explanation: outfit.explanation, badges: outfit.badges,
      })
      setSaved(true)
    } catch {}
  }

  return (
    <Card className="max-w-full overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {outfit.badges.map((badge) => (
              <Badge key={badge} variant="coral" className="text-[10px]">
                {badge}
              </Badge>
            ))}
          </div>
          <span className="text-lg font-bold">{formatPrice(outfit.total_price)}</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {outfit.items.map((item, idx) => (
            <div
              key={idx}
              className="group/item relative flex min-w-25 flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="h-14 w-14 overflow-hidden rounded-lg shadow-sm">
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
              <p className="line-clamp-1 text-center text-[11px] font-medium">
                {item.product.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.product.brand}</p>
              <p className="text-[11px] font-semibold">{formatPrice(item.product.price)}</p>
              <span className="text-[9px] text-muted-foreground">{item.role}</span>

              {item.replaceable && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-muted px-1.5 text-[8px] text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100">
                  Заменить
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{getScoreLabel(outfit.compatibility_score)}</span>
            <span className="font-medium">{outfit.compatibility_score}%</span>
          </div>
          <Progress
            value={outfit.compatibility_score}
            className="h-1.5"
            indicatorClassName={getScoreColor(outfit.compatibility_score)}
          />
        </div>

        <p className="text-sm text-muted-foreground">{outfit.explanation}</p>
      </CardContent>

      <CardFooter className="flex-col gap-2 border-t p-4">
        <div className="flex w-full gap-2">
          <Button variant="coral" size="sm" className="min-w-0 flex-1 text-xs" onClick={() => addOutfit(outfit.items.map((i) => i.product))}>
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            <span className="truncate">Купить всё</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 text-xs"
            onClick={onTryOnOutfit}
          >
            <Shirt className="mr-1.5 h-3.5 w-3.5" />
            <span className="truncate">Примерить ({outfit.items.length})</span>
          </Button>
        </div>
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 text-xs"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            <span className="truncate">Поделиться</span>
          </Button>
          {onToggleCompare && (
            <Button
              variant={compareSelected ? "coral" : "outline"}
              size="sm"
              className="min-w-0 flex-1 text-xs"
              onClick={() => onToggleCompare(outfit)}
            >
              <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
              <span className="truncate">{compareSelected ? "В сравнении" : "Сравнить"}</span>
            </Button>
          )}
          {isLoggedIn() && (
            <Button
              variant={saved ? "outline" : "outline"}
              size="sm"
              className={`min-w-0 flex-1 text-xs ${saved ? "border-green-500 text-green-600" : ""}`}
              onClick={handleSave}
              disabled={saved}
            >
              {saved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              <span className="truncate">{saved ? "Сохранено" : "Сохранить"}</span>
            </Button>
          )}
        </div>
      </CardFooter>

      <ShareOutfit outfit={outfit} open={shareOpen} onOpenChange={setShareOpen} />
    </Card>
  )
}
