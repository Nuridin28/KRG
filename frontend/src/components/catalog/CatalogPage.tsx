import { useState, useEffect, useMemo, useCallback } from "react"
import { PackageOpen, Shirt, X, SlidersHorizontal, ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api, prefetch } from "@/api/client"
import type { Product } from "@/api/types"
import { ProductCardSkeleton } from "@/components/ui/skeleton"
import { ProductCard } from "./ProductCard"
import { ProductFilters, type FilterValues } from "./ProductFilters"
import { ProductDetail } from "./ProductDetail"
import { Button } from "@/components/ui/button"
import { useNavigation } from "@/store/navigation"
import { useT } from "@/i18n"

interface CatalogPageProps {
  onTryOn: (product: Product) => void
  onBuildOutfit: (product: Product) => void
}

const MAX_TRYON = 5

export function CatalogPage({ onTryOn, onBuildOutfit }: CatalogPageProps) {
  const t = useT()
  const navigate = useNavigate()
  const setTryOnProducts = useNavigation((s) => s.setTryOnProducts)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [tryOnSet, setTryOnSet] = useState<Map<string, Product>>(new Map())
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
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

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileFiltersOpen])

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

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== "").length,
    [filters]
  )

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
    <>
      {/* Editorial hero */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-350 px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-24">
          <p className="eyebrow text-foreground/50 mb-5">SS26 · The Edit</p>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
            <h1 className="font-display text-[44px] leading-[0.95] tracking-tight sm:text-[64px] lg:col-span-8 lg:text-[88px]">
              {t.catalog.title}
              <span className="block italic font-light text-foreground/55">
                considered.
              </span>
            </h1>
            <div className="flex flex-col justify-end lg:col-span-4">
              <p className="max-w-md text-[15px] leading-relaxed text-foreground/65">
                {t.catalog.subtitle}
              </p>
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={() => navigate("/stylist")}
                  className="group flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-70"
                >
                  Visit AI Stylist
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-350 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
          {/* Desktop sidebar filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <ProductFilters filters={filters} onFilterChange={setFilters} brands={brands} />
            </div>
          </aside>

          <main>
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="flex items-center gap-2 border border-border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/75 transition-colors hover:border-foreground hover:text-foreground lg:hidden"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t.filters.title}
                  {activeFilterCount > 0 && (
                    <span className="-mr-1 ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] text-background">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/55">
                  <span className="editorial-num text-foreground">{filteredProducts.length}</span>
                  <span className="mx-2 opacity-40">·</span>
                  {t.catalog.found.replace(":", "").trim() || "Items"}
                </p>
              </div>

              {tryOnSet.size > 0 && (
                <button
                  onClick={() => setTryOnSet(new Map())}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-foreground/55 transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  {t.catalog.resetSelection} ({tryOnSet.size})
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-2 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="font-display text-2xl text-destructive">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.catalog.apiErrorHint}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
                <PackageOpen className="mb-6 h-10 w-10 text-foreground/25" strokeWidth={1.25} />
                <p className="font-display text-2xl">{t.catalog.noProducts}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.catalog.noProductsHint}
                </p>
              </div>
            ) : (
              <div className="stagger-children grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-2 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
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
            )}
          </main>
        </div>

        {/* Floating try-on button */}
        {tryOnSet.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-fade-in-up">
            <Button
              variant="editorial"
              size="lg"
              className="gap-3 rounded-full px-7 shadow-2xl shadow-foreground/20"
              onClick={handleGoToTryOn}
            >
              <Shirt className="h-4 w-4" strokeWidth={1.5} />
              {t.common.tryOn}
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background/20 px-1.5 text-[10px] font-bold tracking-normal">
                {tryOnSet.size}
              </span>
            </Button>
          </div>
        )}

        {/* Mobile filters drawer */}
        {mobileFiltersOpen && (
          <div
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
        )}
        <div
          className={`fixed left-0 top-0 z-50 flex h-dvh w-80 max-w-[85vw] flex-col border-r border-border/60 bg-background shadow-2xl transition-transform duration-500 ease-out lg:hidden ${
            mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <p className="eyebrow text-foreground">{t.filters.title}</p>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="close"
              className="flex h-8 w-8 items-center justify-center text-foreground/65 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <ProductFilters filters={filters} onFilterChange={setFilters} brands={brands} />
          </div>
          <div className="border-t border-border/60 p-4">
            <Button
              variant="editorial"
              size="lg"
              className="w-full"
              onClick={() => setMobileFiltersOpen(false)}
            >
              View {filteredProducts.length} items
            </Button>
          </div>
        </div>

        <ProductDetail
          product={selectedProduct}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onBuildOutfit={onBuildOutfit}
          onTryOn={onTryOn}
        />
      </div>
    </>
  )
}
