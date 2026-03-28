import { useState, useEffect, useMemo } from "react"
import { PackageOpen } from "lucide-react"
import { api, prefetch } from "@/api/client"
import type { Product } from "@/api/types"
import { ProductCardSkeleton } from "@/components/ui/skeleton"
import { ProductCard } from "./ProductCard"
import { ProductFilters, type FilterValues } from "./ProductFilters"
import { ProductDetail } from "./ProductDetail"

interface CatalogPageProps {
  onTryOn: (product: Product) => void
  onBuildOutfit: (product: Product) => void
}

export function CatalogPage({ onTryOn, onBuildOutfit }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "",
    style: "",
    gender: "",
    brand: "",
    priceMin: "",
    priceMax: "",
  })

  // Prefetch brands on mount
  useEffect(() => {
    prefetch("/catalog/brands", 300_000)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params: Record<string, string> = { page_size: "50" }
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

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
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
              <p className="mb-4 text-sm text-muted-foreground">
                Найдено: {filteredProducts.length}
              </p>
              <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={handleSelectProduct}
                    onTryOn={onTryOn}
                    onBuildOutfit={onBuildOutfit}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

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
