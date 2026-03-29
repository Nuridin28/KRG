import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: "user" | "admin"
  is_active: boolean
}

interface AuthStore {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  isAdmin: () => boolean
  isLoggedIn: () => boolean
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      isAdmin: () => get().user?.role === "admin",

      isLoggedIn: () => !!get().token,
    }),
    { name: "ai-stylist-auth" }
  )
)
