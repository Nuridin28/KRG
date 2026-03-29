import { create } from "zustand"
import type { Product, Outfit, TryOnJob } from "@/api/types"
import { api } from "@/api/client"

let pollInterval: ReturnType<typeof setInterval> | null = null

interface NavigationStore {
  anchorProduct: Product | null
  tryOnProducts: Product[]
  tryOnJob: TryOnJob | null
  tryOnPersonPreview: string | null
  setAnchorProduct: (product: Product | null) => void
  setTryOnProducts: (products: Product[]) => void
  setTryOnFromOutfit: (outfit: Outfit) => void
  setTryOnJob: (job: TryOnJob | null) => void
  setTryOnPersonPreview: (url: string | null) => void
  startPolling: (jobId: string) => void
  stopPolling: () => void
}

export const useNavigation = create<NavigationStore>()((set, get) => ({
  anchorProduct: null,
  tryOnProducts: [],
  tryOnJob: null,
  tryOnPersonPreview: null,

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

  setTryOnJob: (job) => set({ tryOnJob: job }),

  setTryOnPersonPreview: (url) => set({ tryOnPersonPreview: url }),

  startPolling: (jobId: string) => {
    get().stopPolling()
    pollInterval = setInterval(async () => {
      try {
        const updated = await api.tryon.getJob(jobId)
        set({ tryOnJob: updated })
        if (updated.status === "completed" || updated.status === "failed") {
          get().stopPolling()
        }
      } catch {
        get().stopPolling()
        set({
          tryOnJob: {
            ...(get().tryOnJob || { job_id: jobId, progress: 0, total_items: 0, completed_items: 0, created_at: "" }),
            status: "failed" as const,
            failure_reason: "Сессия примерки потеряна. Попробуйте снова.",
          },
        })
      }
    }, 2000)
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  },
}))
