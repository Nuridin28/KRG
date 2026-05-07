import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { apiUrl } from "@/lib/utils"

const TOKEN_KEY = "koktem-token"
const FREE_COUNT_KEY = "koktem-free-count"
const FREE_LIMIT = 3

interface Quota {
  daily_quota: number
  used_today: number
  remaining: number
}

interface AuthContextValue {
  token: string | null
  email: string | null
  freeUsed: number
  freeLimit: number
  freeRemaining: number
  quota: Quota | null
  needsRegistration: boolean
  incrementFree: () => void
  setToken: (token: string, email: string) => void
  signOut: () => void
  refreshQuota: () => Promise<void>
  decrementQuotaLocally: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface StoredToken {
  token: string
  email: string
}

function readStoredToken(): StoredToken | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.token === "string" && typeof parsed.email === "string") {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function readFreeCount(): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(FREE_COUNT_KEY)
  const num = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(num) && num >= 0 ? num : 0
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredToken | null>(readStoredToken)
  const [freeUsed, setFreeUsed] = useState<number>(readFreeCount)
  const [quota, setQuota] = useState<Quota | null>(null)

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY)
    setStored(null)
    setQuota(null)
  }, [])

  const refreshQuota = useCallback(async () => {
    if (!stored) {
      setQuota(null)
      return
    }
    try {
      const res = await fetch(apiUrl("/auth/b2c/quota"), {
        headers: { Authorization: `Bearer ${stored.token}` },
      })
      if (res.status === 401) {
        signOut()
        return
      }
      if (res.ok) {
        const data: Quota = await res.json()
        setQuota(data)
      }
    } catch {
      // ignore network errors
    }
  }, [stored, signOut])

  useEffect(() => {
    if (!stored) return
    let cancelled = false
    fetch(apiUrl("/auth/b2c/quota"), {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 401) {
          window.localStorage.removeItem(TOKEN_KEY)
          setStored(null)
          return
        }
        if (res.ok) {
          const data: Quota = await res.json()
          if (!cancelled) setQuota(data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [stored])

  const incrementFree = useCallback(() => {
    setFreeUsed((prev) => {
      const next = Math.min(FREE_LIMIT, prev + 1)
      window.localStorage.setItem(FREE_COUNT_KEY, String(next))
      return next
    })
  }, [])

  const setToken = useCallback((token: string, email: string) => {
    const value: StoredToken = { token, email }
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(value))
    setStored(value)
  }, [])

  const decrementQuotaLocally = useCallback(() => {
    setQuota((q) =>
      q
        ? {
            ...q,
            used_today: q.used_today + 1,
            remaining: Math.max(0, q.remaining - 1),
          }
        : q,
    )
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const hasToken = !!stored
    return {
      token: stored?.token ?? null,
      email: stored?.email ?? null,
      freeUsed,
      freeLimit: FREE_LIMIT,
      freeRemaining: hasToken ? FREE_LIMIT : Math.max(0, FREE_LIMIT - freeUsed),
      quota,
      needsRegistration: !hasToken && freeUsed >= FREE_LIMIT,
      incrementFree,
      setToken,
      signOut,
      refreshQuota,
      decrementQuotaLocally,
    }
  }, [stored, freeUsed, quota, incrementFree, setToken, signOut, refreshQuota, decrementQuotaLocally])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
