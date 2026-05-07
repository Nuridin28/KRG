import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type ThemeMode = "light" | "dark" | "system"
const STORAGE_KEY = "tryon-theme"

function detectInitial(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (stored === "light" || stored === "dark" || stored === "system") return stored
  return "system"
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === "system") {
    root.removeAttribute("data-theme")
  } else {
    root.setAttribute("data-theme", mode)
  }
}

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(detectInitial)

  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode: (next) => {
        window.localStorage.setItem(STORAGE_KEY, next)
        setModeState(next)
      },
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
