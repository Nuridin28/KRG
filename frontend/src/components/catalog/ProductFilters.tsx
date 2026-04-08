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
import { useT } from "@/i18n"

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
  const t = useT()

  const CATEGORY_LABELS = t.categories as Record<CategoryType, string>
  const STYLE_LABELS = t.styles as Record<StyleType, string>
  const GENDER_LABELS = t.genders as Record<GenderType, string>

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
        <h3 className="text-sm font-semibold">{t.filters.title}</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="mr-1 h-3 w-3" />
            {t.filters.reset}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.filters.searchPlaceholder}
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t.filters.categoryLabel}
          </label>
          <Select value={filters.category} onValueChange={(v) => updateFilter("category", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.filters.allCategories} />
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
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.filters.styleLabel}</label>
          <Select value={filters.style} onValueChange={(v) => updateFilter("style", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.filters.anyStyle} />
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
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.filters.genderLabel}</label>
          <Select value={filters.gender} onValueChange={(v) => updateFilter("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.filters.forAll} />
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
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t.filters.brandLabel}</label>
          <Select value={filters.brand} onValueChange={(v) => updateFilter("brand", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t.filters.allBrands} />
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
            {t.filters.priceLabel}
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t.filters.priceFrom}
              value={filters.priceMin}
              onChange={(e) => updateFilter("priceMin", e.target.value)}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder={t.filters.priceTo}
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
