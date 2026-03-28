import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ProductBrief } from "@/api/types"

export interface CartItem {
  product: ProductBrief
  quantity: number
  size?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (product: ProductBrief, size?: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  addOutfit: (products: ProductBrief[]) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, size) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1, size }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }))
      },

      addOutfit: (products) => {
        set((state) => {
          const newItems = [...state.items]
          for (const product of products) {
            if (!newItems.find((i) => i.product.id === product.id)) {
              newItems.push({ product, quantity: 1 })
            }
          }
          return { items: newItems }
        })
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + (i.product.promo_price || i.product.price) * i.quantity, 0),
    }),
    {
      name: "ai-stylist-cart",
    }
  )
)
