import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { StyleType, OccasionType, GenderType, OutfitGenerateRequest } from "@/api/types"
import { useT } from "@/i18n"

interface OutfitFormProps {
  loading: boolean
  onSubmit: (request: OutfitGenerateRequest) => void
  anchorProductId?: string
}

export function OutfitForm({ loading, onSubmit, anchorProductId }: OutfitFormProps) {
  const t = useT()
  const [style, setStyle] = useState<StyleType>("casual")
  const [occasion, setOccasion] = useState<OccasionType>("daily")
  const [gender, setGender] = useState<GenderType>("female")
  const [budgetMin, setBudgetMin] = useState("")
  const [budgetMax, setBudgetMax] = useState("")

  const STYLE_LABELS: Record<StyleType, string> = {
    casual: t.styles.casual,
    office: t.styles.office,
    sport: t.styles.sport,
    evening: t.styles.evening,
    street: t.styles.street,
    smart_casual: t.styles.smart_casual,
    date: t.styles.date,
    travel: t.styles.travel,
  }

  const OCCASION_LABELS: Record<OccasionType, string> = {
    daily: t.occasions.daily,
    work: t.occasions.work,
    date: t.occasions.date,
    party: t.occasions.party,
    workout: t.occasions.workout,
    travel: t.occasions.travel,
    event: t.occasions.event,
    casual: t.occasions.casual,
  }

  const GENDER_LABELS: Record<GenderType, string> = {
    male: t.genders.male,
    female: t.genders.female,
    unisex: t.genders.unisex,
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const request: OutfitGenerateRequest = {
      style,
      occasion,
      gender,
      ...(budgetMin && { budget_min: Number(budgetMin) }),
      ...(budgetMax && { budget_max: Number(budgetMax) }),
      ...(anchorProductId && { anchor_product_id: anchorProductId }),
      count: 3,
    }
    onSubmit(request)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-5">
      <div>
        <h3
          className="text-lg font-bold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {t.stylist.formTitle}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t.stylist.formSubtitle}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t.stylist.styleLabel}</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as StyleType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STYLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t.stylist.occasionLabel}</Label>
          <Select value={occasion} onValueChange={(v) => setOccasion(v as OccasionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OCCASION_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t.stylist.genderLabel}</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as GenderType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t.stylist.budgetLabel}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t.stylist.budgetMin}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
            <Input
              type="number"
              placeholder={t.stylist.budgetMax}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Button type="submit" variant="coral" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.stylist.generatingBtn}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            {t.stylist.generateButton}
          </>
        )}
      </Button>
    </form>
  )
}
