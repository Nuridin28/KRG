import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Loader2, Shirt, Search, X, Check, User, Upload, Star } from "lucide-react"
import { api } from "@/api/client"
import type { Product, CategoryType, UserPhoto } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { ImageUpload } from "./ImageUpload"
import { TryOnResult } from "./TryOnResult"
import { useNavigation } from "@/store/navigation"
import { useAuth } from "@/store/auth"
import { useProfile } from "@/store/profile"
import { useT } from "@/i18n"
import { getApiOrigin } from "@/lib/apiEnv"

const MAX_ITEMS = 5

const CATEGORY_ORDER: CategoryType[] = ["tops", "outerwear", "bottoms", "dresses", "shoes", "accessories", "sets"]

export function TryOnPage() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const tryOnProducts = useNavigation((s) => s.tryOnProducts)
  const job = useNavigation((s) => s.tryOnJob)
  const personPreview = useNavigation((s) => s.tryOnPersonPreview)
  const { setTryOnJob, setTryOnPersonPreview, startPolling } = useNavigation()

  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const { photos, setPhotos } = useProfile()

  const [personImage, setPersonImage] = useState<File | null>(null)
  const [selectedSavedPhoto, setSelectedSavedPhoto] = useState<UserPhoto | null>(null)
  const [photoMode, setPhotoMode] = useState<"saved" | "upload">("upload")
  const [chosenProducts, setChosenProducts] = useState<Product[]>(tryOnProducts)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Product search
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Load saved photos
  useEffect(() => {
    if (isLoggedIn()) {
      api.profile.getPhotos().then((p) => {
        setPhotos(p)
        if (p.length > 0) {
          setPhotoMode("saved")
          const def = p.find((ph) => ph.is_default) || p[0]
          setSelectedSavedPhoto(def)
          setTryOnPersonPreview(`${getApiOrigin()}${def.image_url}`)
        }
      }).catch(() => {})
    }
  }, [isLoggedIn, setPhotos, setTryOnPersonPreview])

  // Restore job from URL on page refresh
  useEffect(() => {
    const jobId = searchParams.get("job")
    if (jobId && !job) {
      api.tryon.getJob(jobId).then((restored) => {
        setTryOnJob(restored)
        if (restored.status === "queued" || restored.status === "processing") {
          startPolling(jobId)
        }
      }).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tryOnProducts.length > 0) {
      setChosenProducts(tryOnProducts.slice(0, MAX_ITEMS))
    }
  }, [tryOnProducts])

  // Load products for selection
  useEffect(() => {
    setLoadingProducts(true)
    const params: Record<string, string> = { page_size: "100" }
    if (searchQuery) params.search = searchQuery
    api.catalog
      .getAll(params)
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [searchQuery])

  const handleImageSelected = (file: File) => {
    setPersonImage(file)
    setSelectedSavedPhoto(null)
    setPhotoMode("upload")
    setTryOnPersonPreview(URL.createObjectURL(file))
  }

  const handleSelectSavedPhoto = useCallback((photo: UserPhoto) => {
    setSelectedSavedPhoto(photo)
    setPersonImage(null)
    setPhotoMode("saved")
    setTryOnPersonPreview(`${getApiOrigin()}${photo.image_url}`)
  }, [setTryOnPersonPreview])

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

  const hasPhoto = photoMode === "saved" ? !!selectedSavedPhoto : !!personImage

  const handleSubmit = async () => {
    if (chosenProducts.length === 0) return
    setSubmitting(true)
    setError(null)
    setTryOnJob(null)

    try {
      const productIds = chosenProducts.map((p) => p.id)

      // Use saved photo (quick try-on) or uploaded file
      if (photoMode === "saved" && selectedSavedPhoto) {
        // Quick try-on via saved photo — only supports single product for now
        if (productIds.length === 1) {
          const newJob = await api.profile.quickTryOn(productIds[0], selectedSavedPhoto.id)
          setTryOnJob(newJob)
          setSearchParams({ job: newJob.job_id })
          startPolling(newJob.job_id)
        } else {
          // For multiple products, download saved photo and use regular endpoint
          const resp = await fetch(`${getApiOrigin()}${selectedSavedPhoto.image_url}`)
          const blob = await resp.blob()
          const file = new File([blob], "saved-photo.jpg", { type: blob.type })
          const newJob = await api.tryon.createOutfitJob(file, productIds)
          setTryOnJob(newJob)
          setSearchParams({ job: newJob.job_id })
          startPolling(newJob.job_id)
        }
      } else if (personImage) {
        const newJob =
          productIds.length === 1
            ? await api.tryon.createJob(personImage, productIds[0])
            : await api.tryon.createOutfitJob(personImage, productIds)
        setTryOnJob(newJob)
        setSearchParams({ job: newJob.job_id })
        startPolling(newJob.job_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.tryon.startError)
    } finally {
      setSubmitting(false)
    }
  }

  const isProductSelected = (id: string) => chosenProducts.some((p) => p.id === id)

  const categoryLabels: Record<CategoryType, string> = t.categories

  const groupedProducts = useMemo(() => {
    const map = new Map<CategoryType, Product[]>()
    for (const p of products) {
      const cat = p.category as CategoryType
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      items: map.get(cat)!,
    }))
  }, [products, categoryLabels])

  const buttonLabel =
    chosenProducts.length <= 1
      ? t.tryon.tryOnButton
      : `${t.tryon.tryOnButton} (${chosenProducts.length} ${t.common.items})`

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {t.tryon.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.tryon.subtitle.replace("{max}", String(MAX_ITEMS))}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
        <div className="space-y-5">
          {/* Photo selection — saved or upload */}
          <div className="rounded-lg border bg-card p-5">
            <Label className="mb-3 block text-sm font-semibold">{t.tryon.selectPhoto}</Label>

            {/* Mode tabs — only show if user has saved photos */}
            {isLoggedIn() && photos.length > 0 && (
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoMode("saved")
                    const def = photos.find((p) => p.is_default) || photos[0]
                    if (def) handleSelectSavedPhoto(def)
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    photoMode === "saved" ? "bg-foreground text-background" : "bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  {t.tryon.myPhoto}
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode("upload")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    photoMode === "upload" ? "bg-foreground text-background" : "bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t.tryon.uploadNew}
                </button>
              </div>
            )}

            {/* Saved photos grid */}
            {photoMode === "saved" && photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelectSavedPhoto(photo)}
                    className={`relative aspect-3/4 overflow-hidden rounded-lg border-2 transition-all ${
                      selectedSavedPhoto?.id === photo.id
                        ? "border-foreground ring-1 ring-foreground/20"
                        : "border-transparent hover:border-foreground/30"
                    }`}
                  >
                    <img
                      src={`${getApiOrigin()}${photo.image_url}`}
                      alt={t.tryon.savedPhoto}
                      className="h-full w-full object-cover"
                    />
                    {selectedSavedPhoto?.id === photo.id && (
                      <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    {photo.is_default && (
                      <div className="absolute left-1.5 top-1.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <ImageUpload onImageSelected={handleImageSelected} selectedImage={personImage} />
            )}
          </div>

          {/* Product selection */}
          <div className="rounded-lg border bg-card p-5">
            <Label className="mb-3 block text-sm font-semibold">
              {t.tryon.selectProducts}{" "}
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
                    className="flex items-center gap-2 rounded-lg border-2 border-foreground/15 bg-foreground/3 px-2 py-1.5"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={product.image_url || undefined}
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
                placeholder={t.tryon.searchCatalog}
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
                <div className="space-y-4">
                  {groupedProducts.map((group) => (
                    <div key={group.category}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {group.items.map((product) => {
                          const selected = isProductSelected(product.id)
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleToggleProduct(product)}
                              disabled={!selected && chosenProducts.length >= MAX_ITEMS}
                              className={`group relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                                selected
                                  ? "border-foreground bg-foreground/5 ring-1 ring-foreground/10"
                                  : chosenProducts.length >= MAX_ITEMS
                                    ? "cursor-not-allowed opacity-40"
                                    : "hover:border-foreground/50 hover:bg-foreground/3"
                              }`}
                            >
                              {selected && (
                                <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                              <div className="aspect-square w-full overflow-hidden rounded-md bg-muted/50">
                                <img
                                  src={product.image_url || undefined}
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
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            variant="coral"
            className="w-full"
            disabled={!hasPhoto || chosenProducts.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.common.loading}
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
                  indicatorClassName="bg-foreground"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {job.current_step || (job.status === "queued" ? t.tryon.queued : t.tryon.processing)}
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
                              ? "bg-foreground"
                              : i === job.completed_items &&
                                  job.status === "processing"
                                ? "animate-pulse bg-foreground/30 ring-2 ring-foreground/10"
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
