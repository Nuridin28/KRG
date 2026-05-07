import { useEffect, useRef, useState } from "react"
import { Globe, Check } from "lucide-react"
import { useI18n } from "@/i18n/context"
import type { Locale } from "@/i18n/messages"
import { cn } from "@/lib/utils"

const LOCALES: Locale[] = ["ru", "en", "kz"]
const LABELS: Record<Locale, string> = {
  ru: "RU",
  en: "EN",
  kz: "KZ",
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur transition",
          "hover:bg-muted",
        )}
      >
        <Globe className="size-3.5" />
        <span>{LABELS[locale]}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-in"
        >
          {LOCALES.map((l) => {
            const active = locale === l
            return (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLocale(l)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm transition",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{t.lang[l]}</span>
                  {active && <Check className="size-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
