import { useState, useCallback, useMemo } from "react"
import {
  Shirt,
  Briefcase,
  Heart,
  Palette,
  Sparkles,
  Target,
  Dumbbell,
  Crown,
  Zap,
  PartyPopper,
  Coffee,
  Sun,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn, formatPrice } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StyleProfile {
  styles: string[]
  colors: string[]
  fit: string
  occasions: string[]
  budgetMin: number
  budgetMax: number
  completedAt: string
}

const STORAGE_KEY = "style-profile"

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStyleProfile() {
  const [profile, setProfileState] = useState<StyleProfile | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as StyleProfile) : null
    } catch {
      return null
    }
  })

  const setProfile = useCallback((p: StyleProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    setProfileState(p)
  }, [])

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setProfileState(null)
  }, [])

  return { profile, setProfile, clearProfile }
}

// ─── Data ────────────────────────────────────────────────────────────────────

const STYLES = [
  { id: "casual", label: "Кэжуал", icon: Coffee, desc: "Комфорт каждый день" },
  { id: "business", label: "Деловой", icon: Briefcase, desc: "Офис и встречи" },
  { id: "street", label: "Стритвир", icon: Zap, desc: "Уличный стиль" },
  { id: "romantic", label: "Романтик", icon: Heart, desc: "Нежность и элегантность" },
  { id: "minimalist", label: "Минимализм", icon: Target, desc: "Меньше — больше" },
  { id: "sport", label: "Спорт", icon: Dumbbell, desc: "Активный образ жизни" },
] as const

const COLORS = [
  { id: "black", label: "Чёрный", hex: "#1a1a1a" },
  { id: "white", label: "Белый", hex: "#f5f5f5" },
  { id: "navy", label: "Тёмно-синий", hex: "#1e3a5f" },
  { id: "beige", label: "Бежевый", hex: "#d4b896" },
  { id: "gray", label: "Серый", hex: "#8b8b8b" },
  { id: "brown", label: "Коричневый", hex: "#6b4226" },
  { id: "coral", label: "Коралл", hex: "#FF6B6B" },
  { id: "olive", label: "Оливковый", hex: "#6b7c3e" },
  { id: "burgundy", label: "Бордовый", hex: "#722f37" },
  { id: "sky", label: "Голубой", hex: "#5ba4cf" },
  { id: "pink", label: "Розовый", hex: "#e8a0bf" },
  { id: "green", label: "Зелёный", hex: "#2d8659" },
] as const

const FITS = [
  { id: "slim", label: "Slim Fit", desc: "Приталенный, подчёркивает фигуру" },
  { id: "regular", label: "Regular Fit", desc: "Классическая посадка" },
  { id: "oversized", label: "Oversized", desc: "Свободный крой, комфорт" },
] as const

const OCCASIONS = [
  { id: "everyday", label: "Повседневный", icon: Sun },
  { id: "work", label: "Работа", icon: Briefcase },
  { id: "date", label: "Свидание", icon: Heart },
  { id: "party", label: "Вечеринка", icon: PartyPopper },
  { id: "sport", label: "Спорт", icon: Dumbbell },
] as const

const STEPS = [
  { title: "Ваш стиль", subtitle: "Выберите 1–3 стиля, которые вам близки" },
  { title: "Любимые цвета", subtitle: "Выберите до 3 цветов" },
  { title: "Посадка", subtitle: "Какой крой вам нравится?" },
  { title: "Повод", subtitle: "Для каких случаев ищете одежду?" },
  { title: "Бюджет", subtitle: "Укажите ваш ценовой диапазон" },
] as const

const TOTAL_STEPS = STEPS.length

// ─── Component ───────────────────────────────────────────────────────────────

interface StyleQuizProps {
  onComplete?: (profile: StyleProfile) => void
}

export default function StyleQuiz({ onComplete }: StyleQuizProps) {
  const { setProfile } = useStyleProfile()

  const [step, setStep] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedFit, setSelectedFit] = useState<string>("")
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  const [budgetMin, setBudgetMin] = useState(40)
  const [budgetMax, setBudgetMax] = useState(200)
  const [completed, setCompleted] = useState(false)

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return selectedStyles.length > 0
      case 1: return selectedColors.length > 0
      case 2: return selectedFit !== ""
      case 3: return selectedOccasions.length > 0
      case 4: return true
      default: return false
    }
  }, [step, selectedStyles, selectedColors, selectedFit, selectedOccasions])

  const toggleMulti = (arr: string[], id: string, max: number): string[] => {
    if (arr.includes(id)) return arr.filter((x) => x !== id)
    if (arr.length >= max) return arr
    return [...arr, id]
  }

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
      setAnimKey((k) => k + 1)
    } else {
      handleComplete()
    }
  }

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1)
      setAnimKey((k) => k + 1)
    }
  }

  const handleComplete = () => {
    const profile: StyleProfile = {
      styles: selectedStyles,
      colors: selectedColors,
      fit: selectedFit,
      occasions: selectedOccasions,
      budgetMin,
      budgetMax,
      completedAt: new Date().toISOString(),
    }
    setProfile(profile)
    setCompleted(true)
    onComplete?.(profile)
  }

  const handleRestart = () => {
    setStep(0)
    setAnimKey((k) => k + 1)
    setSelectedStyles([])
    setSelectedColors([])
    setSelectedFit("")
    setSelectedOccasions([])
    setBudgetMin(40)
    setBudgetMax(200)
    setCompleted(false)
  }

  // ─── Summary Screen ─────────────────────────────────────────────────────

  if (completed) {
    const labelMap: Record<string, string> = {}
    for (const s of STYLES) labelMap[s.id] = s.label
    for (const c of COLORS) labelMap[c.id] = c.label
    for (const f of FITS) labelMap[f.id] = f.label
    for (const o of OCCASIONS) labelMap[o.id] = o.label

    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-lg">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
              <Sparkles className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">Ваш стиль-профиль</h2>
              <p className="text-sm text-muted-foreground">Готово! Теперь мы подберём для вас лучшее</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Styles */}
            <SummaryRow label="Стили">
              <div className="flex flex-wrap gap-1.5">
                {selectedStyles.map((s) => (
                  <Badge key={s} variant="coral">{labelMap[s]}</Badge>
                ))}
              </div>
            </SummaryRow>

            {/* Colors */}
            <SummaryRow label="Цвета">
              <div className="flex gap-2">
                {selectedColors.map((c) => {
                  const color = COLORS.find((x) => x.id === c)
                  return (
                    <div key={c} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: color?.hex }}
                      />
                      <span className="text-sm">{labelMap[c]}</span>
                    </div>
                  )
                })}
              </div>
            </SummaryRow>

            {/* Fit */}
            <SummaryRow label="Посадка">
              <Badge variant="secondary">{labelMap[selectedFit]}</Badge>
            </SummaryRow>

            {/* Occasions */}
            <SummaryRow label="Повод">
              <div className="flex flex-wrap gap-1.5">
                {selectedOccasions.map((o) => (
                  <Badge key={o} variant="secondary">{labelMap[o]}</Badge>
                ))}
              </div>
            </SummaryRow>

            {/* Budget */}
            <SummaryRow label="Бюджет">
              <span className="text-sm font-semibold">
                {formatPrice(budgetMin)} — {formatPrice(budgetMax)}
              </span>
            </SummaryRow>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4" />
              Пройти заново
            </Button>
            <Button variant="coral" className="flex-1 gap-2" onClick={() => onComplete?.({
              styles: selectedStyles,
              colors: selectedColors,
              fit: selectedFit,
              occasions: selectedOccasions,
              budgetMin,
              budgetMax,
              completedAt: new Date().toISOString(),
            })}>
              <Sparkles className="h-4 w-4" />
              К покупкам
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Quiz Steps ──────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Шаг {step + 1} из {TOTAL_STEPS}
          </span>
        </div>
        <Palette className="h-5 w-5 text-foreground" />
      </div>

      {/* Progress */}
      <Progress
        value={progress}
        className="mb-6 h-2"
        indicatorClassName="bg-foreground transition-all duration-500"
      />

      {/* Step Content */}
      <div key={animKey} className="animate-fade-in-up">
        <h2 className="font-heading mb-1 text-2xl font-bold">{STEPS[step].title}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{STEPS[step].subtitle}</p>

        {/* Step 0: Styles */}
        {step === 0 && (
          <div className="stagger-children grid grid-cols-2 gap-3">
            {STYLES.map((s) => {
              const Icon = s.icon
              const active = selectedStyles.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyles(toggleMulti(selectedStyles, s.id, 3))}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                    "hover:border-foreground/40 hover:shadow-md",
                    active
                      ? "border-foreground bg-foreground/3 shadow-md"
                      : "border-border bg-card"
                  )}
                >
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-foreground/15" : "bg-muted"
                  )}>
                    <Icon className={cn("h-6 w-6", active ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 1: Colors */}
        {step === 1 && (
          <div className="stagger-children grid grid-cols-4 gap-3">
            {COLORS.map((c) => {
              const active = selectedColors.includes(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedColors(toggleMulti(selectedColors, c.id, 3))}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200",
                    "hover:shadow-md",
                    active
                      ? "border-foreground bg-foreground/3 shadow-md"
                      : "border-border bg-card hover:border-foreground/15"
                  )}
                >
                  <div className="relative">
                    <span
                      className={cn(
                        "block h-10 w-10 rounded-full border-2 shadow-sm transition-transform duration-200",
                        active ? "scale-110 border-foreground" : "border-transparent group-hover:scale-105"
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                    {active && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground shadow">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{c.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Fit */}
        {step === 2 && (
          <div className="stagger-children flex flex-col gap-3">
            {FITS.map((f) => {
              const active = selectedFit === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFit(f.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
                    "hover:border-foreground/40 hover:shadow-md",
                    active
                      ? "border-foreground bg-foreground/3 shadow-md"
                      : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors",
                    active ? "bg-foreground/15" : "bg-muted"
                  )}>
                    <Shirt className={cn("h-6 w-6", active ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold">{f.label}</span>
                    <span className="block text-xs text-muted-foreground">{f.desc}</span>
                  </div>
                  {active && (
                    <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground">
                      <Check className="h-4 w-4 text-white" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Step 3: Occasions */}
        {step === 3 && (
          <div className="stagger-children grid grid-cols-2 gap-3">
            {OCCASIONS.map((o) => {
              const Icon = o.icon
              const active = selectedOccasions.includes(o.id)
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOccasions(toggleMulti(selectedOccasions, o.id, 5))}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border-2 p-4 transition-all duration-200",
                    "hover:border-foreground/40 hover:shadow-md",
                    active
                      ? "border-foreground bg-foreground/3 shadow-md"
                      : "border-border bg-card"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    active ? "bg-foreground/15" : "bg-muted"
                  )}>
                    <Icon className={cn("h-5 w-5", active ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                  <span className="text-sm font-semibold">{o.label}</span>
                  {active && (
                    <Check className="ml-auto h-4 w-4 text-foreground" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Step 4: Budget */}
        {step === 4 && (
          <div className="stagger-children space-y-8">
            {/* Min budget */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Минимум</span>
                <span className="rounded-lg bg-foreground/5 px-3 py-1 text-sm font-bold text-foreground">
                  {formatPrice(budgetMin)}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={budgetMax - 10}
                step={10}
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="range-coral w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{formatPrice(20)}</span>
                <span>{formatPrice(budgetMax - 10)}</span>
              </div>
            </div>

            {/* Max budget */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Максимум</span>
                <span className="rounded-lg bg-foreground/5 px-3 py-1 text-sm font-bold text-foreground">
                  {formatPrice(budgetMax)}
                </span>
              </div>
              <input
                type="range"
                min={budgetMin + 10}
                max={500}
                step={10}
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="range-coral w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{formatPrice(budgetMin + 10)}</span>
                <span>{formatPrice(500)}</span>
              </div>
            </div>

            {/* Visual summary */}
            <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">Ваш диапазон</p>
              <p className="mt-1 font-heading text-lg font-bold">
                {formatPrice(budgetMin)} — {formatPrice(budgetMax)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="gap-2" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Button>
        )}
        <Button
          variant="coral"
          className="ml-auto gap-2"
          disabled={!canProceed}
          onClick={goNext}
        >
          {step < TOTAL_STEPS - 1 ? (
            <>
              Далее
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Готово
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
