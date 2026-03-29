import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ProductBrief } from "@/api/types"

interface WishlistStore {
  items: ProductBrief[]
  add: (product: ProductBrief) => void
  remove: (productId: string) => void
  toggle: (product: ProductBrief) => void
  has: (productId: string) => boolean
}

export const useWishlist = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product) => {
        set((state) => {
          if (state.items.some((i) => i.id === product.id)) return state
          return { items: [...state.items, product] }
        })
      },

      remove: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== productId) }))
      },

      toggle: (product) => {
        const exists = get().items.some((i) => i.id === product.id)
        if (exists) get().remove(product.id)
        else get().add(product)
      },

      has: (productId) => get().items.some((i) => i.id === productId),
    }),
    { name: "ai-stylist-wishlist" }
  )
)
