import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Shirt, X, Search, ShoppingCart, Sparkles, GripVertical, Trash2, Save } from "lucide-react"
import { api } from "@/api/client"
import { useAuth } from "@/store/auth"
import { useCart } from "@/store/cart"
import { useNavigation } from "@/store/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatPrice } from "@/lib/utils"
import type { Product, ProductBrief } from "@/api/types"

const SLOTS = [
  { id: "top", label: "Верх", categories: ["tops"] },
  { id: "bottom", label: "Низ", categories: ["bottoms"] },
  { id: "shoes", label: "Обувь", categories: ["shoes"] },
  { id: "outerwear", label: "Верхняя одежда", categories: ["outerwear"] },
  { id: "accessory", label: "Аксессуар", categories: ["accessories"] },
  { id: "dress", label: "Платье", categories: ["dresses"] },
]

export function OutfitBuilderPage() {
  const navigate = useNavigate()
  const addOutfit = useCart((s) => s.addOutfit)
  const setTryOnProducts = useNavigation((s) => s.setTryOnProducts)
  const isLoggedIn = useAuth((s) => s.isLoggedIn)

  const [slots, setSlots] = useState<Record<string, Product | null>>({
    top: null, bottom: null, shoes: null, outerwear: null, accessory: null, dress: null,
  })
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [loading, setLoading] = useState(true)
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const params: Record<string, string> = { page_size: "100" }
    if (searchQuery) params.search = searchQuery
    if (filterCat) params.category = filterCat
    api.catalog.getAll(params)
      .then((res) => setProducts(res.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchQuery, filterCat])

  const filledSlots = Object.values(slots).filter(Boolean) as Product[]
  const totalPrice = filledSlots.reduce((sum, p) => sum + (p.promo_price || p.price), 0)

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    setDraggedProduct(product)
    e.dataTransfer.effectAllowed = "copy"
  }

  const handleDrop = useCallback((e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    if (!draggedProduct) return
    setSlots((prev) => ({ ...prev, [slotId]: draggedProduct }))
    setDraggedProduct(null)
  }, [draggedProduct])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleClickAdd = (product: Product, slotId: string) => {
    setSlots((prev) => ({ ...prev, [slotId]: product }))
  }

  const handleRemoveSlot = (slotId: string) => {
    setSlots((prev) => ({ ...prev, [slotId]: null }))
  }

  const handleBuyAll = () => {
    const briefs: ProductBrief[] = filledSlots.map((p) => ({
      id: p.id, name: p.name, brand: p.brand, category: p.category,
      color_hex: p.color_hex, color_name: p.color_name,
      price: p.price, promo_price: p.promo_price,
      currency: p.currency, image_url: p.image_url, in_stock: p.in_stock,
    }))
    addOutfit(briefs)
  }

  const handleTryOn = () => {
    setTryOnProducts(filledSlots.slice(0, 5))
    navigate("/tryon")
  }

  const handleSave = async () => {
    if (!isLoggedIn() || filledSlots.length === 0) return
    setSaving(true)
    try {
      await api.savedOutfits.save({
        items: filledSlots.map((p) => ({
          product_id: p.id, name: p.name, brand: p.brand, category: p.category,
          color_hex: p.color_hex, color_name: p.color_name,
          price: p.price, promo_price: p.promo_price, currency: p.currency,
          image_url: p.image_url, role: p.category,
        })),
        style: "custom",
        occasion: "custom",
        total_price: totalPrice,
        compatibility_score: 0,
        explanation: "Образ собран вручную в конструкторе",
        badges: ["Ваш образ"],
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          Конструктор образа
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Перетаскивайте вещи из каталога на слоты справа, чтобы собрать образ
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Product catalog panel */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск..." className="pl-9" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none">
              <option value="">Все</option>
              <option value="tops">Верх</option>
              <option value="bottoms">Низ</option>
              <option value="dresses">Платья</option>
              <option value="outerwear">Верхняя одежда</option>
              <option value="shoes">Обувь</option>
              <option value="accessories">Аксессуары</option>
            </select>
          </div>

          <ScrollArea className="h-[65vh]">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {products.map((product) => (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, product)}
                  className="group cursor-grab rounded-lg border bg-card p-2 transition-all hover:shadow-md active:cursor-grabbing"
                >
                  <div className="relative aspect-square overflow-hidden rounded-md bg-muted/50">
                    <img src={product.image_url} alt={product.name}
                      className="h-full w-full object-cover" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                      <GripVertical className="h-6 w-6 text-white drop-shadow" />
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-[10px] font-medium">{product.name}</p>
                  <p className="text-[9px] text-muted-foreground">{product.brand}</p>
                  <p className="text-[10px] font-semibold">{formatPrice(product.price, product.currency)}</p>

                  {/* Quick add buttons for mobile */}
                  <div className="mt-1 flex gap-1 lg:hidden">
                    {SLOTS.filter((s) => s.categories.includes(product.category)).map((slot) => (
                      <button key={slot.id} onClick={() => handleClickAdd(product, slot.id)}
                        className="flex-1 rounded bg-foreground/5 py-0.5 text-[8px] font-medium text-foreground hover:bg-foreground/20">
                        + {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Outfit slots panel */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-foreground" />
              Ваш образ
            </h3>

            <div className="space-y-2">
              {SLOTS.map((slot) => {
                const product = slots[slot.id]
                return (
                  <div
                    key={slot.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, slot.id)}
                    className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors ${
                      product ? "border-foreground/15 bg-foreground/3" : "border-muted hover:border-foreground/50"
                    }`}
                  >
                    {product ? (
                      <>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                          <img src={product.image_url} alt={product.name}
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                          <p className="text-xs font-semibold">{formatPrice(product.price, product.currency)}</p>
                        </div>
                        <button onClick={() => handleRemoveSlot(slot.id)}
                          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-1 items-center justify-center py-2">
                        <span className="text-xs text-muted-foreground">
                          Перетащите сюда — {slot.label}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {filledSlots.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">Итого</span>
                  <span className="text-xl font-bold">{formatPrice(totalPrice)}</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="coral" size="sm" className="flex-1 text-xs" onClick={handleBuyAll}>
                    <ShoppingCart className="mr-1 h-3 w-3" /> Купить
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleTryOn}>
                    <Shirt className="mr-1 h-3 w-3" /> Примерить
                  </Button>
                </div>

                {isLoggedIn() && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleSave} disabled={saving}>
                    {saved ? <><Check className="mr-1 h-3 w-3" /> Сохранено!</> :
                     saving ? "Сохраняю..." :
                     <><Save className="mr-1 h-3 w-3" /> Сохранить образ</>}
                  </Button>
                )}

                <Button variant="outline" size="sm" className="w-full text-xs text-red-500 hover:text-red-600"
                  onClick={() => setSlots({ top: null, bottom: null, shoes: null, outerwear: null, accessory: null, dress: null })}>
                  <Trash2 className="mr-1 h-3 w-3" /> Очистить всё
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
