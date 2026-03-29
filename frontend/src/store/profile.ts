import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { UserPhoto } from "@/api/types"

interface ProfileStore {
  photos: UserPhoto[]
  setPhotos: (photos: UserPhoto[]) => void
  addPhoto: (photo: UserPhoto) => void
  removePhoto: (id: number) => void
  hasPhotos: () => boolean
  defaultPhoto: () => UserPhoto | undefined
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set, get) => ({
      photos: [],
      setPhotos: (photos) => set({ photos }),
      addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
      removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
      hasPhotos: () => get().photos.length > 0,
      defaultPhoto: () => get().photos.find((p) => p.is_default) || get().photos[0],
    }),
    { name: "ai-stylist-profile" }
  )
)
