import { useState, useEffect, useCallback } from "react"
import { Camera, Trash2, Star, Upload, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/api/client"
import { useProfile } from "@/store/profile"
import { useAuth } from "@/store/auth"
import { useToast } from "@/hooks/use-toast"
import type { UserPhoto } from "@/api/types"

const API_HOST = import.meta.env.VITE_API_BASE?.replace("/api/v1", "") || "http://localhost:8000"

export function ProfilePhotos() {
  const { photos, setPhotos, addPhoto, removePhoto } = useProfile()
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      api.profile.getPhotos().then(setPhotos).catch(() => {})
    }
  }, [isLoggedIn, setPhotos])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Файл слишком большой", description: "Максимум 10 МБ" })
      return
    }

    setUploading(true)
    try {
      const photo = await api.profile.uploadPhoto(file)
      addPhoto(photo)
      toast({ title: "Фото загружено" })
    } catch (err: any) {
      toast({ title: "Ошибка загрузки", description: err.message })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }, [addPhoto, toast])

  const handleDelete = useCallback(async (photo: UserPhoto) => {
    try {
      await api.profile.deletePhoto(photo.id)
      removePhoto(photo.id)
      // Refresh to get updated defaults
      const updated = await api.profile.getPhotos()
      setPhotos(updated)
      toast({ title: "Фото удалено" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    }
  }, [removePhoto, setPhotos, toast])

  const handleSetDefault = useCallback(async (photo: UserPhoto) => {
    try {
      await api.profile.setDefault(photo.id)
      const updated = await api.profile.getPhotos()
      setPhotos(updated)
      toast({ title: "Основное фото обновлено" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    }
  }, [setPhotos, toast])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Мои фото для примерки</h3>
          <p className="text-sm text-muted-foreground">
            Загрузите фото — и примеряйте вещи в один клик
          </p>
        </div>
        {photos.length < 3 && (
          <label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="coral" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                Загрузить фото
              </span>
            </Button>
          </label>
        )}
      </div>

      {photos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Camera className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Нет загруженных фото</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Загрузите фото в полный рост — и примеряйте любую вещь без повторной загрузки
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <Card key={photo.id} className={`overflow-hidden ${photo.is_default ? "ring-2 ring-foreground" : ""}`}>
              <div className="relative aspect-3/4">
                <img
                  src={`${API_HOST}${photo.image_url}`}
                  alt="Моё фото"
                  className="h-full w-full object-cover"
                />
                {photo.is_default && (
                  <div className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">
                    Основное
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-linear-to-t from-black/60 to-transparent p-2">
                  {!photo.is_default && (
                    <button
                      onClick={() => handleSetDefault(photo)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40"
                      title="Сделать основным"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-red-500/80"
                    title="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
