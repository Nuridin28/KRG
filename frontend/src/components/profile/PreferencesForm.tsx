import { useState, useEffect } from "react"
import { Save, MapPin, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/api/client"
import { useAuth } from "@/store/auth"
import { useToast } from "@/hooks/use-toast"

const ALL_STYLES = [
  { value: "casual", label: "Casual" },
  { value: "office", label: "Office" },
  { value: "sport", label: "Sport" },
  { value: "evening", label: "Evening" },
  { value: "street", label: "Street" },
  { value: "smart_casual", label: "Smart Casual" },
  { value: "date", label: "Date" },
  { value: "travel", label: "Travel" },
]

const GENDERS = [
  { value: "female", label: "Женский" },
  { value: "male", label: "Мужской" },
  { value: "unisex", label: "Унисекс" },
]

export function PreferencesForm() {
  const isLoggedIn = useAuth((s) => s.isLoggedIn)
  const { toast } = useToast()
  const [styles, setStyles] = useState<string[]>([])
  const [gender, setGender] = useState("female")
  const [city, setCity] = useState("")
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      api.profile.getPreferences().then((prefs) => {
        setStyles(prefs.preferred_styles || [])
        setGender(prefs.preferred_gender || "female")
        setCity(prefs.city || "")
        setLoaded(true)
      }).catch(() => setLoaded(true))
    }
  }, [isLoggedIn])

  const toggleStyle = (value: string) => {
    setStyles((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.profile.updatePreferences({
        preferred_styles: styles,
        preferred_gender: gender,
        city: city || undefined,
      })
      toast({ title: "Предпочтения сохранены" })
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Предпочтения стиля</h3>
        <p className="text-sm text-muted-foreground">
          Используются для персонального «Образа дня»
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          {/* Styles */}
          <div className="space-y-2">
            <Label>Любимые стили</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_STYLES.map((s) => (
                <Badge
                  key={s.value}
                  variant={styles.includes(s.value) ? "coral" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-xs"
                  onClick={() => toggleStyle(s.value)}
                >
                  {s.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Пол</Label>
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <Badge
                  key={g.value}
                  variant={gender === g.value ? "coral" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-xs"
                  onClick={() => setGender(g.value)}
                >
                  {g.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label>Город (для погоды)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Москва"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Образ дня будет учитывать погоду в вашем городе
            </p>
          </div>

          <Button variant="coral" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Сохранить
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
