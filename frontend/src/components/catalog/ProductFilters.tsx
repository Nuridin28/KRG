import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CategoryType, GenderType, StyleType } from "@/api/types"

const CATEGORY_LABELS: Record<CategoryType, string> = {
  tops: "Верх",
  bottoms: "Низ",
  outerwear: "Верхняя одежда",
  dresses: "Платья",
  shoes: "Обувь",
  accessories: "Аксессуары",
}

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

const GENDER_LABELS: Record<GenderType, string> = {
  male: "Мужской",
  female: "Женский",
  unisex: "Унисекс",
}

export interface FilterValues {
  search: string
  category: string
  style: string
  gender: string
  brand: string
  priceMin: string
  priceMax: string
}

interface ProductFiltersProps {
  filters: FilterValues
  onFilterChange: (filters: FilterValues) => void
  brands: string[]
}

export function ProductFilters({ filters, onFilterChange, brands }: ProductFiltersProps) {
  const updateFilter = (key: keyof FilterValues, value: string) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFilterChange({
      search: "",
      category: "",
      style: "",
      gender: "",
      brand: "",
      priceMin: "",
      priceMax: "",
    })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "")

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Фильтры</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="mr-1 h-3 w-3" />
            Сбросить
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск товаров..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Категория
          </label>
          <Select value={filters.category} onValueChange={(v) => updateFilter("category", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Стиль</label>
          <Select value={filters.style} onValueChange={(v) => updateFilter("style", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Любой стиль" />
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Пол</label>
          <Select value={filters.gender} onValueChange={(v) => updateFilter("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Для всех" />
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Бренд</label>
          <Select value={filters.brand} onValueChange={(v) => updateFilter("brand", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Все бренды" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Цена (от - до)
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="От"
              value={filters.priceMin}
              onChange={(e) => updateFilter("priceMin", e.target.value)}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="До"
              value={filters.priceMax}
              onChange={(e) => updateFilter("priceMax", e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
