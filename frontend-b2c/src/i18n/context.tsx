import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { messages, type Locale, type Messages } from "./messages"

const STORAGE_KEY = "tryon-locale"

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "ru"
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored && stored in messages) return stored
  const browser = window.navigator.language.slice(0, 2)
  if (browser === "kk" || browser === "kz") return "kz"
  if (browser === "en") return "en"
  return "ru"
}

interface I18nContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        window.localStorage.setItem(STORAGE_KEY, next)
        setLocaleState(next)
      },
      t: messages[locale],
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
