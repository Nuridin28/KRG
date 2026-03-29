import { useState, useEffect, useMemo, useCallback } from "react"
import { PackageOpen, Shirt, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api, prefetch } from "@/api/client"
import type { Product } from "@/api/types"
import { ProductCardSkeleton } from "@/components/ui/skeleton"
import { ProductCard } from "./ProductCard"
import { ProductFilters, type FilterValues } from "./ProductFilters"
import { ProductDetail } from "./ProductDetail"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/store/navigation"

interface CatalogPageProps {
  onTryOn: (product: Product) => void
  onBuildOutfit: (product: Product) => void
}

const MAX_TRYON = 5

export function CatalogPage({ onTryOn, onBuildOutfit }: CatalogPageProps) {
  const navigate = useNavigate()
  const setTryOnProducts = useNavigation((s) => s.setTryOnProducts)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [tryOnSet, setTryOnSet] = useState<Map<string, Product>>(new Map())
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "",
    style: "",
    gender: "",
    brand: "",
    priceMin: "",
    priceMax: "",
  })

  useEffect(() => {
    prefetch("/catalog/brands", 300_000)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params: Record<string, string> = { page_size: "100" }
    if (filters.category) params.category = filters.category
    if (filters.gender) params.gender = filters.gender

    Promise.all([api.catalog.getAll(params), api.catalog.getBrands().catch(() => [] as string[])])
      .then(([catalog, brandList]) => {
        setProducts(catalog.items)
        setBrands(brandList)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filters.category, filters.gender])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.brand.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q)
        )
          return false
      }
      if (filters.style && !p.style_tags.includes(filters.style)) return false
      if (filters.brand && p.brand !== filters.brand) return false
      if (filters.priceMin && p.price < Number(filters.priceMin)) return false
      if (filters.priceMax && p.price > Number(filters.priceMax)) return false
      return true
    })
  }, [products, filters])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setDetailOpen(true)
  }

  const handleToggleTryOn = useCallback((product: Product) => {
    setTryOnSet((prev) => {
      const next = new Map(prev)
      if (next.has(product.id)) {
        next.delete(product.id)
      } else if (next.size < MAX_TRYON) {
        next.set(product.id, product)
      }
      return next
    })
  }, [])

  const handleGoToTryOn = useCallback(() => {
    const items = Array.from(tryOnSet.values())
    setTryOnProducts(items)
    navigate("/tryon")
  }, [tryOnSet, setTryOnProducts, navigate])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Каталог
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Откройте для себя стильные вещи и соберите идеальный образ
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        <aside className="hidden lg:block">
          <ProductFilters filters={filters} onFilterChange={setFilters} brands={brands} />
        </aside>

        <main>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Убедитесь, что сервер запущен на localhost:8000
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
              <PackageOpen className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-medium">Товары не найдены</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Попробуйте изменить параметры поиска
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Найдено: {filteredProducts.length}
                </p>
                {tryOnSet.size > 0 && (
                  <button
                    onClick={() => setTryOnSet(new Map())}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    Сбросить выбор ({tryOnSet.size})
                  </button>
                )}
              </div>
              <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    onTryOn={onTryOn}
                    tryOnSelected={tryOnSet.has(product.id)}
                    onToggleTryOn={handleToggleTryOn}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Floating try-on button */}
      {tryOnSet.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <Button
            variant="coral"
            size="lg"
            className="gap-2 rounded-full px-6 shadow-lg"
            onClick={handleGoToTryOn}
          >
            <Shirt className="h-4 w-4" />
            Примерить
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold">
              {tryOnSet.size}
            </span>
          </Button>
        </div>
      )}

      <ProductDetail
        product={selectedProduct}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onBuildOutfit={onBuildOutfit}
        onTryOn={onTryOn}
      />
    </div>
  )
}
