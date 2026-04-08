import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ru } from "./ru"
import { en } from "./en"
import { kz } from "./kz"
import type { Lang, Translations } from "./types"

export type { Lang, Translations }

const locales: Record<Lang, Translations> = { ru, en, kz }

export const LANG_LABELS: Record<Lang, string> = {
  ru: "Рус",
  en: "Eng",
  kz: "Қаз",
}

interface I18nStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useI18n = create<I18nStore>()(
  persist(
    (set) => ({
      lang: "ru",
      setLang: (lang) => set({ lang }),
    }),
    { name: "ai-stylist-lang" },
  ),
)

/** Main translation hook. Returns `t` — the full translations object for the current language. */
export function useT(): Translations {
  const lang = useI18n((s) => s.lang)
  return locales[lang]
}
