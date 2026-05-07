import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Plus,
  Trash2,
  Loader2,
  Shirt,
  Sparkles,
  Check,
  Inbox,
  X,
} from "lucide-react"
import { cn, resolveImageUrl } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { useAuth } from "@/auth/context"
import {
  createOutfit,
  deleteOutfit as apiDeleteOutfit,
  deleteWardrobeItem,
  listOutfits,
  listWardrobe,
  type GarmentCategory,
  type Outfit,
  type WardrobeItem,
} from "@/lib/api"

const CATEGORIES: GarmentCategory[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
]

interface WardrobePageProps {
  onSignInRequest: () => void
}

export function WardrobePage({ onSignInRequest }: WardrobePageProps) {
  const { t } = useI18n()
  const { token } = useAuth()
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [outfitName, setOutfitName] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [is, os] = await Promise.all([listWardrobe(token), listOutfits(token)])
      setItems(is)
      setOutfits(os)
    } catch {
      // ignore for now
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    Promise.all([listWardrobe(token), listOutfits(token)])
      .then(([is, os]) => {
        if (cancelled) return
        setItems(is)
        setOutfits(os)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const groupedItems = useMemo(() => {
    const groups: Record<string, WardrobeItem[]> = {}
    for (const it of items) {
      ;(groups[it.category] ||= []).push(it)
    }
    return groups
  }, [items])

  const handleDelete = async (id: number) => {
    if (!token) return
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelected((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })
    try {
      await deleteWardrobeItem(token, id)
    } catch {
      refresh()
    }
  }

  const toggleSelect = (id: number) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startSelect = () => {
    setSelectMode(true)
    setSelected(new Set())
    setOutfitName("")
    setSaveError(null)
  }

  const cancelSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
    setSaveError(null)
  }

  const saveOutfit = async () => {
    if (!token) return
    setSaveError(null)
    if (selected.size === 0) {
      setSaveError(t.outfits.needAtLeastOne)
      return
    }
    if (!outfitName.trim()) {
      setSaveError(t.outfits.needName)
      return
    }
    setSaving(true)
    try {
      const created = await createOutfit(token, {
        name: outfitName.trim(),
        item_ids: Array.from(selected),
      })
      setOutfits((prev) => [created, ...prev])
      cancelSelect()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOutfit = async (id: string) => {
    if (!token) return
    setOutfits((prev) => prev.filter((o) => o.id !== id))
    try {
      await apiDeleteOutfit(token, id)
    } catch {
      refresh()
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-5" />
        </div>
        <p className="text-sm text-muted-foreground">{t.wardrobe.requireSignIn}</p>
        <button
          type="button"
          onClick={onSignInRequest}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
        >
          {t.account.signIn}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Wardrobe items */}
      <section>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {t.wardrobe.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.wardrobe.subtitle}
            </p>
          </div>
          {items.length > 0 && !selectMode && (
            <button
              type="button"
              onClick={startSelect}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              <Plus className="size-4" />
              {t.outfits.create}
            </button>
          )}
        </header>

        {selectMode && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t.outfits.selected.replace("{n}", String(selected.size))}
              </span>
              <span className="text-xs text-muted-foreground/60">
                · {t.outfits.selectHint}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder={t.outfits.namePlaceholder}
                maxLength={120}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={saveOutfit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {t.outfits.saveOutfit}
              </button>
              <button
                type="button"
                onClick={cancelSelect}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                {t.outfits.cancelSelection}
              </button>
            </div>
            {saveError && (
              <p className="mt-2 text-xs text-danger">{saveError}</p>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center">
            <Shirt className="size-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">{t.wardrobe.empty}</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {CATEGORIES.filter((c) => groupedItems[c]?.length).map((cat) => (
              <div key={cat}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.wardrobe.categories[cat]}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {groupedItems[cat].map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      selectMode={selectMode}
                      selected={selected.has(item.id)}
                      onToggle={() => toggleSelect(item.id)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outfits */}
      <section>
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {t.outfits.title}
        </h2>
        {outfits.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center">
            <Sparkles className="size-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">{t.outfits.empty}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onDelete={() => handleDeleteOutfit(outfit.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface ItemCardProps {
  item: WardrobeItem
  selectMode: boolean
  selected: boolean
  onToggle: () => void
  onDelete: () => void
}

function ItemCard({ item, selectMode, selected, onToggle, onDelete }: ItemCardProps) {
  const handleClick = () => {
    if (selectMode) onToggle()
  }
  return (
    <div
      role={selectMode ? "button" : undefined}
      tabIndex={selectMode ? 0 : -1}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (selectMode && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        "group relative aspect-[3/4] overflow-hidden rounded-2xl border bg-muted",
        selectMode
          ? "cursor-pointer border-border hover:border-foreground/40"
          : "border-border",
        selected && "border-accent ring-2 ring-accent/40",
      )}
    >
      <img
        src={resolveImageUrl(item.image_url)}
        alt={item.name || ""}
        className="size-full object-cover"
      />
      {selectMode && (
        <div
          className={cn(
            "absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full transition",
            selected
              ? "bg-accent text-accent-foreground"
              : "bg-black/40 text-white backdrop-blur",
          )}
        >
          {selected && <Check className="size-4" />}
        </div>
      )}
      {!selectMode && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Удалить"
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/70"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
      {item.name && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-[11px] font-medium text-white">
          {item.name}
        </div>
      )}
    </div>
  )
}

function OutfitCard({
  outfit,
  onDelete,
}: {
  outfit: Outfit
  onDelete: () => void
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 transition hover:bg-muted/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{outfit.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {outfit.items.length} ·{" "}
            {new Date(outfit.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Удалить"
          className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {outfit.items.slice(0, 6).map((it) => (
          <div
            key={it.id}
            className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            {it.image_url && (
              <img
                src={resolveImageUrl(it.image_url)}
                alt=""
                className="size-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
