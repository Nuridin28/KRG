import { useState, useEffect, useCallback } from "react"
import { Shirt, Trash2, Sparkles, Loader2, Plus, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/api/client"
import { useWardrobe } from "@/store/wardrobe"
import { useAuth } from "@/store/auth"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils"
import { CapsuleAnalysis } from "./CapsuleAnalysis"
import type { Product, CapsuleAnalysis as CapsuleAnalysisType } from "@/api/types"

const CAT_LABELS: Record<string, string> = {
  tops: "Верх", bottoms: "Низ", dresses: "Платья",
  outerwear: "Верхняя одежда", shoes: "Обувь", accessories: "Аксессуары",
}

export function WardrobePage() {
  const { items, setItems, removeItem } = useWardrobe()
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const { toast } = useToast()
  const [analysis, setAnalysis] = useState<CapsuleAnalysisType | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (isLoggedIn()) {
      api.wardrobe.getItems().then(setItems).catch(() => {})
    }
  }, [isLoggedIn, setItems])

  const handleRemove = useCallback(async (id: number) => {
    try {
      await api.wardrobe.removeItem(id)
      removeItem(id)
      setAnalysis(null)
      toast({ title: "Убрано из гардероба" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    }
  }, [removeItem, toast])

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    try {
      const result = await api.wardrobe.analyze()
      setAnalysis(result)
    } catch (err: any) {
      toast({ title: "Ошибка анализа", description: err.message })
    } finally {
      setAnalyzing(false)
    }
  }, [toast])

  const handleOpenCatalog = useCallback(async () => {
    setShowCatalog(true)
    try {
      const resp = await api.catalog.getAll({ page_size: "100" })
      setCatalogProducts(resp.items)
    } catch {
      setCatalogProducts([])
    }
  }, [])

  const handleAddFromCatalog = useCallback(async (product: Product) => {
    setAdding(product.id)
    try {
      const item = await api.wardrobe.addItem({ product_id: product.id })
      setItems([item, ...items])
      setAnalysis(null)
      toast({ title: "Добавлено в гардероб", description: product.name })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    } finally {
      setAdding(null)
    }
  }, [items, setItems, toast])

  const filteredCatalog = catalogProducts.filter(
    (p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group wardrobe items by category
  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    acc[it.category] = acc[it.category] || []
    acc[it.category].push(it)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10">
            <Shirt className="h-5 w-5 text-coral" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Мой гардероб</h1>
            <p className="text-sm text-muted-foreground">{items.length} вещей</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenCatalog}>
            <Plus className="mr-1.5 h-4 w-4" /> Добавить из каталога
          </Button>
          {items.length >= 2 && (
            <Button variant="coral" size="sm" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              Анализ капсулы
            </Button>
          )}
        </div>
      </div>

      {/* Catalog search modal */}
      {showCatalog && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Добавить из каталога</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCatalog(false)}>Закрыть</Button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или бренду..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {filteredCatalog.slice(0, 20).map((p) => {
                const inWardrobe = items.some((i) => i.product_id === p.id)
                return (
                  <button
                    key={p.id}
                    disabled={inWardrobe || adding === p.id}
                    onClick={() => handleAddFromCatalog(p)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${
                      inWardrobe ? "border-coral/30 bg-coral/5 opacity-60" : "hover:border-coral hover:bg-accent"
                    }`}
                  >
                    <div
                      className="h-8 w-8 shrink-0 rounded-full border"
                      style={{ backgroundColor: p.color_hex || "#ccc" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-muted-foreground">{p.brand} · {formatPrice(p.price, p.currency)}</p>
                    </div>
                    {adding === p.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {inWardrobe && <Badge variant="secondary" className="text-[9px]">В гардеробе</Badge>}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wardrobe items grouped by category */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shirt className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Гардероб пуст</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Добавьте вещи из каталога, чтобы AI проанализировал ваш гардероб и подсказал, чего не хватает
            </p>
            <Button variant="coral" size="sm" className="mt-4" onClick={handleOpenCatalog}>
              <Plus className="mr-1.5 h-4 w-4" /> Добавить из каталога
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {CAT_LABELS[cat] || cat} ({catItems.length})
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {catItems.map((item) => (
                  <Card key={item.id} className="group overflow-hidden">
                    <div className="relative aspect-square bg-muted/50">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          target.parentElement!.innerHTML = `<div class="flex h-full w-full items-center justify-center"><div class="h-16 w-16 rounded-full shadow-inner" style="background-color: ${item.color_hex || '#ccc'}"></div></div>`
                        }}
                      />
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                        title="Убрать из гардероба"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <CardContent className="p-2.5">
                      <p className="truncate text-xs font-medium">{item.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.color_hex || "#ccc" }} />
                        <span className="text-[10px] text-muted-foreground">{item.color_name}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Capsule analysis */}
      {analysis && (
        <div className="mt-8">
          <CapsuleAnalysis analysis={analysis} onAddToWardrobe={handleAddFromCatalog} />
        </div>
      )}
    </div>
  )
}
