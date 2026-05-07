import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
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

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border-b border-border/50 pb-5">
      <p className="eyebrow text-foreground/55 mb-3">{label}</p>
      {children}
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-foreground">{t.filters.title}</p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-foreground/60 transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t.filters.reset}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/45" strokeWidth={1.5} />
        <input
          placeholder={t.filters.searchPlaceholder}
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full border-0 border-b border-input bg-transparent py-2.5 pl-6 pr-2 text-sm transition-colors placeholder:text-foreground/45 focus:border-foreground focus:outline-none"
        />
      </div>

      <Section label={t.filters.categoryLabel}>
        <Select value={filters.category} onValueChange={(v) => updateFilter("category", v)}>
          <SelectTrigger className="border-0 border-b border-input bg-transparent rounded-none px-0 hover:border-foreground focus:border-foreground">
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
      </Section>

      <Section label={t.filters.styleLabel}>
        <Select value={filters.style} onValueChange={(v) => updateFilter("style", v)}>
          <SelectTrigger className="border-0 border-b border-input bg-transparent rounded-none px-0 hover:border-foreground focus:border-foreground">
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
      </Section>

      <Section label={t.filters.genderLabel}>
        <Select value={filters.gender} onValueChange={(v) => updateFilter("gender", v)}>
          <SelectTrigger className="border-0 border-b border-input bg-transparent rounded-none px-0 hover:border-foreground focus:border-foreground">
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
      </Section>

      <Section label={t.filters.brandLabel}>
        <Select value={filters.brand} onValueChange={(v) => updateFilter("brand", v)}>
          <SelectTrigger className="border-0 border-b border-input bg-transparent rounded-none px-0 hover:border-foreground focus:border-foreground">
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
      </Section>

      <div>
        <p className="eyebrow text-foreground/55 mb-3">{t.filters.priceLabel}</p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder={t.filters.priceFrom}
            value={filters.priceMin}
            onChange={(e) => updateFilter("priceMin", e.target.value)}
          />
          <span className="text-foreground/40">—</span>
          <Input
            type="number"
            placeholder={t.filters.priceTo}
            value={filters.priceMax}
            onChange={(e) => updateFilter("priceMax", e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
