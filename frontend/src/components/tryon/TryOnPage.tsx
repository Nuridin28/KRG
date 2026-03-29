import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2, Shirt, Search, X, Check } from "lucide-react"
import { api } from "@/api/client"
import type { Product, TryOnJob } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { ImageUpload } from "./ImageUpload"
import { TryOnResult } from "./TryOnResult"
import { useNavigation } from "@/store/navigation"

const MAX_ITEMS = 5

export function TryOnPage() {
  const tryOnProducts = useNavigation((s) => s.tryOnProducts)
  const [personImage, setPersonImage] = useState<File | null>(null)
  const [personPreview, setPersonPreview] = useState<string | null>(null)
  const [chosenProducts, setChosenProducts] = useState<Product[]>(tryOnProducts)
  const [job, setJob] = useState<TryOnJob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Product search
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    if (tryOnProducts.length > 0) {
      setChosenProducts(tryOnProducts.slice(0, MAX_ITEMS))
    }
  }, [tryOnProducts])

  // Load products for selection
  useEffect(() => {
    setLoadingProducts(true)
    const params: Record<string, string> = { page_size: "20" }
    if (searchQuery) params.search = searchQuery
    api.catalog
      .getAll(params)
      .then((res) =>
        setProducts(
          res.items.filter((p) =>
            ["tops", "bottoms", "dresses", "outerwear"].includes(p.category)
          )
        )
      )
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [searchQuery])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    return stopPolling
  }, [stopPolling])

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const updated = await api.tryon.getJob(jobId)
          setJob(updated)
          if (updated.status === "completed" || updated.status === "failed") {
            stopPolling()
          }
        } catch {
          stopPolling()
        }
      }, 2000)
    },
    [stopPolling]
  )

  const handleImageSelected = (file: File) => {
    setPersonImage(file)
    setPersonPreview(URL.createObjectURL(file))
  }

  const handleToggleProduct = (product: Product) => {
    setChosenProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id)
      if (exists) return prev.filter((p) => p.id !== product.id)
      if (prev.length >= MAX_ITEMS) return prev
      return [...prev, product]
    })
  }

  const handleRemoveProduct = (productId: string) => {
    setChosenProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  const handleSubmit = async () => {
    if (!personImage || chosenProducts.length === 0) return
    setSubmitting(true)
    setError(null)
    setJob(null)

    try {
      const productIds = chosenProducts.map((p) => p.id)
      const newJob =
        productIds.length === 1
          ? await api.tryon.createJob(personImage, productIds[0])
          : await api.tryon.createOutfitJob(personImage, productIds)
      setJob(newJob)
      pollJob(newJob.job_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка запуска примерки")
    } finally {
      setSubmitting(false)
    }
  }

  const isProductSelected = (id: string) => chosenProducts.some((p) => p.id === id)

  const buttonLabel =
    chosenProducts.length <= 1
      ? "Примерить"
      : `Примерить образ (${chosenProducts.length} ${chosenProducts.length <= 4 ? "вещи" : "вещей"})`

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Виртуальная примерка
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Загрузите своё фото и выберите до {MAX_ITEMS} вещей для примерки образа
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
        <div className="space-y-5">
          {/* Photo upload */}
          <div className="rounded-lg border bg-card p-5">
            <Label className="mb-3 block text-sm font-semibold">1. Загрузите фото</Label>
            <ImageUpload onImageSelected={handleImageSelected} selectedImage={personImage} />
          </div>

          {/* Product selection */}
          <div className="rounded-lg border bg-card p-5">
            <Label className="mb-3 block text-sm font-semibold">
              2. Выберите вещи для примерки{" "}
              <span className="font-normal text-muted-foreground">
                ({chosenProducts.length}/{MAX_ITEMS})
              </span>
            </Label>

            {/* Selected products strip */}
            {chosenProducts.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {chosenProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-2 rounded-lg border-2 border-coral/30 bg-coral/5 px-2 py-1.5"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="max-w-25 truncate text-xs font-medium">
                      {product.name}
                    </span>
                    <button
                      onClick={() => handleRemoveProduct(product.id)}
                      className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search and product grid */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по каталогу..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-60">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {products.map((product) => {
                    const selected = isProductSelected(product.id)
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleToggleProduct(product)}
                        disabled={!selected && chosenProducts.length >= MAX_ITEMS}
                        className={`group relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                          selected
                            ? "border-coral bg-coral/10 ring-1 ring-coral/30"
                            : chosenProducts.length >= MAX_ITEMS
                              ? "cursor-not-allowed opacity-40"
                              : "hover:border-coral/50 hover:bg-coral/5"
                        }`}
                      >
                        {selected && (
                          <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        <div className="aspect-square w-full overflow-hidden rounded-md bg-muted/50">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="line-clamp-1 text-[10px] font-medium">{product.name}</p>
                        <p className="text-[9px] text-muted-foreground">{product.brand}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            variant="coral"
            className="w-full"
            disabled={!personImage || chosenProducts.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Shirt className="mr-2 h-4 w-4" />
                {buttonLabel}
              </>
            )}
          </Button>

          {/* Progress section during processing */}
          {job && (job.status === "queued" || job.status === "processing") && (
            <div className="rounded-lg border bg-card p-5">
              <div className="space-y-3">
                <Progress
                  value={job.progress}
                  className="w-full"
                  indicatorClassName="bg-coral"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {job.current_step || (job.status === "queued" ? "В очереди..." : "Обработка...")}
                  </span>
                  <span className="font-medium">{job.progress}%</span>
                </div>

                {/* Step dots for multi-item jobs */}
                {job.total_items > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {Array.from({ length: job.total_items }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className={`h-3 w-3 rounded-full transition-all ${
                            i < job.completed_items
                              ? "bg-coral"
                              : i === job.completed_items &&
                                  job.status === "processing"
                                ? "animate-pulse bg-coral/50 ring-2 ring-coral/30"
                                : "bg-muted"
                          }`}
                        />
                        <span className="text-[9px] text-muted-foreground">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <TryOnResult job={job} personPreview={personPreview} onBuildOutfit={() => {}} />
        </div>
      </div>
    </div>
  )
}
