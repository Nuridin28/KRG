import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { WardrobeItem } from "@/api/types"

interface WardrobeStore {
  items: WardrobeItem[]
  setItems: (items: WardrobeItem[]) => void
  addItem: (item: WardrobeItem) => void
  removeItem: (id: number) => void
  hasProduct: (productId: string) => boolean
}

export const useWardrobe = create<WardrobeStore>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      hasProduct: (productId) => get().items.some((i) => i.product_id === productId),
    }),
    { name: "ai-stylist-wardrobe" }
  )
)
