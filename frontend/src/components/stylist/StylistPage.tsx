import { useState, useCallback } from "react"
import { Sparkles } from "lucide-react"
import { api } from "@/api/client"
import type { Outfit, OutfitGenerateRequest, Product } from "@/api/types"
import { OutfitForm } from "./OutfitForm"
import { OutfitCard } from "./OutfitCard"
import { OutfitComparison, FloatingCompareButton } from "./OutfitComparison"
import { OutfitCardSkeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { useCart } from "@/store/cart"

interface StylistPageProps {
  anchorProduct?: Product | null
  onTryOn: (productId: string) => void
}

export function StylistPage({ anchorProduct, onTryOn }: StylistPageProps) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)
  const addOutfit = useCart((s) => s.addOutfit)

  const toggleCompare = useCallback((outfit: Outfit) => {
    setCompareSet((prev) => {
      const next = new Set(prev)
      if (next.has(outfit.id)) {
        next.delete(outfit.id)
      } else if (next.size < 3) {
        next.add(outfit.id)
      }
      return next
    })
  }, [])

  const handleGenerate = async (request: OutfitGenerateRequest) => {
    setLoading(true)
    setError(null)
    setOutfits([])
    setProgress(20)

    try {
      const timer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 15, 85))
      }, 500)

      let results: Outfit[]
      if (request.anchor_product_id) {
        results = await api.outfits.byProduct({
          product_id: request.anchor_product_id,
          occasion: request.occasion,
          budget_max: request.budget_max,
        })
      } else {
        results = await api.outfits.generate(request)
      }

      clearInterval(timer)
      setProgress(100)
      setOutfits(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать образ")
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 500)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          AI Стилист
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Искусственный интеллект подберёт идеальный образ под ваши предпочтения
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside>
          <OutfitForm
            loading={loading}
            onSubmit={handleGenerate}
            anchorProductId={anchorProduct?.id}
          />
        </aside>

        <main className="space-y-4">
          {loading && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
                <p className="text-sm font-medium">AI подбирает образы...</p>
                <Progress value={progress} className="mx-auto max-w-xs" indicatorClassName="bg-coral" />
              </div>
              {[1, 2].map((i) => (
                <OutfitCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center animate-fade-in-up">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && outfits.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center shadow-sm animate-fade-in-up">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-coral/10">
                <Sparkles className="h-9 w-9 text-coral/40" />
              </div>
              <p className="text-lg font-medium">Создайте свой первый образ</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Заполните параметры слева и нажмите &laquo;Создать образ&raquo;, чтобы AI подобрал
                стильные сочетания
              </p>
            </div>
          )}

          <div className="stagger-children space-y-4">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onTryOn={onTryOn}
                compareSelected={compareSet.has(outfit.id)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        </main>
      </div>

      {compareSet.size >= 2 && (
        <FloatingCompareButton
          selectedCount={compareSet.size}
          onClick={() => setShowComparison(true)}
        />
      )}

      {showComparison && (
        <OutfitComparison
          outfits={outfits.filter((o) => compareSet.has(o.id))}
          onClose={() => {
            setShowComparison(false)
            setCompareSet(new Set())
          }}
          onBuyAll={(items) => addOutfit(items)}
          onTryOn={onTryOn}
        />
      )}
    </div>
  )
}
