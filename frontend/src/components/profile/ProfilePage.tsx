import { User } from "lucide-react"
import { ProfilePhotos } from "./ProfilePhotos"
import { PreferencesForm } from "./PreferencesForm"

export function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
          <User className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Мой профиль</h1>
          <p className="text-sm text-muted-foreground">Фото для примерки и стилевые предпочтения</p>
        </div>
      </div>

      <div className="space-y-10">
        <ProfilePhotos />
        <PreferencesForm />
      </div>
    </div>
  )
}
