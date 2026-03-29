import { create } from "zustand"
import type { Product, Outfit } from "@/api/types"

interface NavigationStore {
  anchorProduct: Product | null
  tryOnProducts: Product[]
  setAnchorProduct: (product: Product | null) => void
  setTryOnProducts: (products: Product[]) => void
  setTryOnFromOutfit: (outfit: Outfit) => void
}

export const useNavigation = create<NavigationStore>()((set) => ({
  anchorProduct: null,
  tryOnProducts: [],

  setAnchorProduct: (product) => set({ anchorProduct: product }),

  setTryOnProducts: (products) => set({ tryOnProducts: products }),

  setTryOnFromOutfit: (outfit) => {
    const products = outfit.items.map((item) => ({
      ...item.product,
      sku_id: "",
      subcategory: "",
      gender: "unisex" as const,
      description: "",
      color: "",
      color_hex: item.product.color_hex,
      color_name: item.product.color_name,
      pattern: "",
      fit: "",
      material: "",
      currency: "USD",
      sizes: [],
      style_tags: [],
      occasion_tags: [],
      season: "all",
      seller_id: "",
    })) as Product[]
    set({ tryOnProducts: products })
  },
}))
