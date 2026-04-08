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
import { useT } from "@/i18n"

const STYLE_KEYS = ["casual", "office", "sport", "evening", "street", "smart_casual", "date", "travel"] as const

const GENDER_KEYS = ["female", "male", "unisex"] as const

export function PreferencesForm() {
  const t = useT()
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
      toast({ title: t.profile.preferencesSaved })
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t.profile.preferencesTitle}</h3>
        <p className="text-sm text-muted-foreground">
          {t.profile.preferencesSubtitle}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          {/* Styles */}
          <div className="space-y-2">
            <Label>{t.profile.favoriteStyles}</Label>
            <div className="flex flex-wrap gap-2">
              {STYLE_KEYS.map((key) => (
                <Badge
                  key={key}
                  variant={styles.includes(key) ? "coral" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-xs"
                  onClick={() => toggleStyle(key)}
                >
                  {t.styles[key]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>{t.profile.genderLabel}</Label>
            <div className="flex gap-2">
              {GENDER_KEYS.map((key) => (
                <Badge
                  key={key}
                  variant={gender === key ? "coral" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-xs"
                  onClick={() => setGender(key)}
                >
                  {t.genders[key]}
                </Badge>
              ))}
            </div>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label>{t.profile.cityLabel}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.profile.cityPlaceholder}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.profile.cityHint}
            </p>
          </div>

          <Button variant="coral" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {t.common.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
