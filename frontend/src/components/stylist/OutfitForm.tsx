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

const STYLE_LABELS: Record<StyleType, string> = {
  casual: "Повседневный",
  office: "Деловой",
  sport: "Спортивный",
  evening: "Вечерний",
  street: "Уличный",
  smart_casual: "Smart Casual",
  date: "Для свидания",
  travel: "Для путешествий",
}

const OCCASION_LABELS: Record<OccasionType, string> = {
  daily: "На каждый день",
  work: "Работа",
  date: "Свидание",
  party: "Вечеринка",
  workout: "Тренировка",
  travel: "Путешествие",
  event: "Мероприятие",
  casual: "Повседневный",
}

const GENDER_LABELS: Record<GenderType, string> = {
  male: "Мужской",
  female: "Женский",
  unisex: "Унисекс",
}

interface OutfitFormProps {
  loading: boolean
  onSubmit: (request: OutfitGenerateRequest) => void
  anchorProductId?: string
}

export function OutfitForm({ loading, onSubmit, anchorProductId }: OutfitFormProps) {
  const [style, setStyle] = useState<StyleType>("casual")
  const [occasion, setOccasion] = useState<OccasionType>("daily")
  const [gender, setGender] = useState<GenderType>("female")
  const [budgetMin, setBudgetMin] = useState("")
  const [budgetMax, setBudgetMax] = useState("")

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
          Параметры образа
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Укажите предпочтения, и AI подберёт идеальный образ
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Стиль</Label>
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
          <Label>Повод</Label>
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
          <Label>Пол</Label>
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
          <Label>Бюджет</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Мин."
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Макс."
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
            Подбираем...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Создать образ
          </>
        )}
      </Button>
    </form>
  )
}
