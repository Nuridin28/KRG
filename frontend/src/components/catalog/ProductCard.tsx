import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Shirt, Check, Heart, Zap, Plus, Loader2 } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { useWishlist } from "@/store/wishlist"
import { useProfile } from "@/store/profile"
import { useWardrobe } from "@/store/wardrobe"
import { useAuth } from "@/store/auth"
import { api } from "@/api/client"
import { useToast } from "@/hooks/use-toast"
import { useT } from "@/i18n"
import type { Product } from "@/api/types"
import { resolveMediaUrl } from "@/lib/apiEnv"

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
  onTryOn: (product: Product) => void
  tryOnSelected?: boolean
  onToggleTryOn?: (product: Product) => void
}

export function ProductCard({ product, onSelect, onTryOn, tryOnSelected, onToggleTryOn }: ProductCardProps) {
  const t = useT()
  const navigate = useNavigate()
  const wishlist = useWishlist()
  const isWished = wishlist.has(product.id)
  const hasPhotos = useProfile((s) => s.hasPhotos)
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const inWardrobe = useWardrobe((s) => s.hasProduct(product.id))
  const wardrobeAdd = useWardrobe((s) => s.addItem)
  const { toast } = useToast()
  const [quickLoading, setQuickLoading] = useState(false)
  const [wardrobeLoading, setWardrobeLoading] = useState(false)

  const handleQuickTryOn = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setQuickLoading(true)
      try {
        const job = await api.profile.quickTryOn(product.id)
        toast({ title: t.product.selectedForTryOn, description: product.name })
        navigate(`/tryon?job=${job.job_id}`)
      } catch (err: any) {
        toast({ title: t.common.error, description: err.message })
      } finally {
        setQuickLoading(false)
      }
    },
    [product, navigate, toast, t]
  )

  const handleAddToWardrobe = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (inWardrobe) return
      setWardrobeLoading(true)
      try {
        const item = await api.wardrobe.addItem({ product_id: product.id })
        wardrobeAdd(item)
        toast({ title: t.product.addedToWardrobe, description: product.name })
      } catch (err: any) {
        toast({ title: t.common.error, description: err.message })
      } finally {
        setWardrobeLoading(false)
      }
    },
    [product, inWardrobe, wardrobeAdd, toast, t]
  )

  const showQuickTryOn = isLoggedIn() && hasPhotos()

  return (
    <article
      className={`group relative flex h-full cursor-pointer flex-col ${
        tryOnSelected ? "outline outline-offset-[10px] outline-foreground" : ""
      }`}
    >
      {/* Image */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-muted/40"
        onClick={() => onSelect(product)}
      >
        <img
          src={resolveMediaUrl(product.image_url)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-32 w-32 rounded-full" style="background-color: ${product.color_hex || '#ccc'}"></div></div>`
          }}
        />

        {/* Top badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {product.promo_price && (
            <span className="bg-foreground px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-background">
              {t.catalog.discount}
            </span>
          )}
        </div>

        {/* Top-right actions */}
        <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              wishlist.toggle({
                id: product.id,
                name: product.name,
                brand: product.brand,
                category: product.category,
                color_hex: product.color_hex,
                color_name: product.color_name,
                price: product.price,
                promo_price: product.promo_price,
                currency: product.currency,
                image_url: product.image_url,
                in_stock: product.in_stock,
              })
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
              isWished
                ? "bg-foreground text-background"
                : "bg-background/85 text-foreground/80 hover:bg-foreground hover:text-background"
            }`}
            title={isWished ? t.product.removeFromWishlist : t.product.addToWishlist}
            aria-label="wishlist"
          >
            <Heart className={`h-3.5 w-3.5 ${isWished ? "fill-current" : ""}`} strokeWidth={1.5} />
          </button>

          {onToggleTryOn && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleTryOn(product)
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                tryOnSelected
                  ? "bg-foreground text-background"
                  : "bg-background/85 text-foreground/80 hover:bg-foreground hover:text-background"
              }`}
              title={tryOnSelected ? t.product.removeFromTryOn : t.product.addToTryOn}
              aria-label="try on selection"
            >
              {tryOnSelected ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Shirt className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </button>
          )}
        </div>

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-[2px]">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/80">
              {t.catalog.outOfStock}
            </span>
          </div>
        )}

        {/* Hover CTA bar — desktop only */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (showQuickTryOn) handleQuickTryOn(e)
              else onTryOn(product)
            }}
            disabled={quickLoading || !product.in_stock}
            className="flex w-full items-center justify-center gap-2 bg-foreground/95 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-background backdrop-blur-md transition-all hover:bg-foreground disabled:opacity-60"
          >
            {quickLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : showQuickTryOn ? (
              <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Shirt className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {showQuickTryOn ? t.common.tryOnSelf : t.common.tryOn}
          </button>
        </div>
      </div>

      {/* Caption */}
      <div className="flex flex-1 flex-col gap-1.5 pt-4" onClick={() => onSelect(product)}>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/55">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 font-display text-[15px] font-normal leading-tight tracking-tight text-foreground sm:text-base">
          {product.name}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            {product.promo_price ? (
              <>
                <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
                  {formatPrice(product.promo_price, product.currency)}
                </span>
                <span className="text-xs text-foreground/40 line-through">
                  {formatPrice(product.price, product.currency)}
                </span>
              </>
            ) : (
              <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
                {formatPrice(product.price, product.currency)}
              </span>
            )}
          </div>
          <div
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-border/80"
            style={{ backgroundColor: product.color_hex || "#ccc" }}
            title={product.color_name}
          />
        </div>

        {/* Mobile-only actions row */}
        <div className="mt-3 flex gap-1.5 md:hidden">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (showQuickTryOn) handleQuickTryOn(e)
              else onTryOn(product)
            }}
            disabled={quickLoading || !product.in_stock}
            className="flex flex-1 items-center justify-center gap-1.5 border border-foreground bg-foreground px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-background disabled:opacity-60"
          >
            {quickLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : showQuickTryOn ? (
              <Zap className="h-3 w-3" strokeWidth={1.5} />
            ) : (
              <Shirt className="h-3 w-3" strokeWidth={1.5} />
            )}
            {showQuickTryOn ? t.common.tryOnSelf : t.common.tryOn}
          </button>
          {isLoggedIn() && (
            <button
              onClick={handleAddToWardrobe}
              disabled={inWardrobe || wardrobeLoading}
              className="flex h-9 w-9 items-center justify-center border border-border text-foreground/75 transition-colors hover:border-foreground hover:text-foreground disabled:opacity-60"
              aria-label={inWardrobe ? t.product.inWardrobe : t.product.toWardrobe}
            >
              {wardrobeLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : inWardrobe ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
          )}
        </div>

        {/* Desktop wardrobe link */}
        {isLoggedIn() && (
          <button
            onClick={handleAddToWardrobe}
            disabled={inWardrobe || wardrobeLoading}
            className="mt-2 hidden items-center gap-1.5 self-start text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/60 transition-colors hover:text-foreground disabled:opacity-60 md:inline-flex"
          >
            {wardrobeLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : inWardrobe ? (
              <Check className="h-3 w-3" strokeWidth={2} />
            ) : (
              <Plus className="h-3 w-3" strokeWidth={1.5} />
            )}
            {inWardrobe ? t.product.inWardrobe : t.product.toWardrobe}
          </button>
        )}
      </div>
    </article>
  )
}
