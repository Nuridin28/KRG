import { useState } from "react"
import { Bookmark, Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { useAuth } from "@/auth/context"
import { saveWardrobeItem, type GarmentCategory } from "@/lib/api"

interface SaveToWardrobeProps {
  garmentImageUrl: string
  onRequireSignIn: () => void
  onSaved?: () => void
}

const CATEGORIES: GarmentCategory[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
]

export function SaveToWardrobe({
  garmentImageUrl,
  onRequireSignIn,
  onSaved,
}: SaveToWardrobeProps) {
  const { t } = useI18n()
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState<GarmentCategory>("tops")
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    if (!token) {
      onRequireSignIn()
      return
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await saveWardrobeItem(token, {
        image_url: garmentImageUrl,
        name: name.trim(),
        category,
      })
      setDone(true)
      onSaved?.()
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setName("")
      }, 1200)
    } catch (e) {
      setError((e as Error).message || t.wardrobe.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3",
          "border border-border bg-card text-sm font-medium transition hover:bg-muted active:scale-[0.99]",
        )}
      >
        <Bookmark className="size-4" />
        {t.wardrobe.addToWardrobe}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in"
            onClick={() => !saving && setOpen(false)}
          />
          <div
            className={cn(
              "relative w-full sm:w-[440px] sm:max-w-[calc(100vw-2rem)]",
              "rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl",
              "p-6 sm:p-8 animate-in",
            )}
          >
            <button
              type="button"
              onClick={() => !saving && setOpen(false)}
              aria-label={t.wardrobe.cancel}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <X className="size-4" />
            </button>

            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Bookmark className="size-5" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
              {t.wardrobe.addToWardrobe}
            </h2>

            <div className="mt-6 flex gap-4">
              <img
                src={garmentImageUrl}
                alt=""
                className="size-24 shrink-0 rounded-xl border border-border object-cover"
              />
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wd-name"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {t.wardrobe.nameLabel}
                  </label>
                  <input
                    id="wd-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.wardrobe.namePlaceholder}
                    maxLength={120}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t.wardrobe.categoryLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      category === c
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {t.wardrobe.categories[c]}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-danger">{error}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || done}
              className={cn(
                "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3",
                "text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50",
              )}
            >
              {done ? (
                <>
                  <Check className="size-4" /> {t.wardrobe.saved}
                </>
              ) : saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t.wardrobe.save
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
