import { useState, useEffect, useCallback } from "react"
import { api } from "@/api/client"
import type { AdminStats, Product } from "@/api/types"
import type { AuthUser } from "@/store/auth"
import {
  Package, Users, BarChart3, Trash2, Plus, Edit2, X, Check,
  ShoppingBag, Shirt, Eye, TrendingUp, Settings,
} from "lucide-react"

type AdminTab = "stats" | "products" | "users" | "flags"

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("stats")

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Админ-панель</h1>
        <p className="text-sm text-muted-foreground">Управление платформой AI Stylist</p>
      </div>

      <div className="mb-6 flex gap-2">
        {([
          { id: "stats", label: "Статистика", icon: BarChart3 },
          { id: "products", label: "Товары", icon: Package },
          { id: "users", label: "Пользователи", icon: Users },
          { id: "flags", label: "Feature Flags", icon: Settings },
        ] as const).map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === item.id
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </div>

      {tab === "stats" && <StatsPanel />}
      {tab === "products" && <ProductsPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "flags" && <FlagsPanel />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function StatsPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">Загрузка...</div>
  if (!stats) return null

  const cards = [
    { label: "Товаров", value: stats.total_products, icon: ShoppingBag, color: "text-blue-500" },
    { label: "Пользователей", value: stats.total_users, icon: Users, color: "text-green-500" },
    { label: "Аутфитов создано", value: stats.total_outfits_generated, icon: Shirt, color: "text-purple-500" },
    { label: "Примерок", value: stats.total_tryon_jobs, icon: Eye, color: "text-orange-500" },
    { label: "Событий", value: stats.total_events, icon: TrendingUp, color: "text-cyan-500" },
    { label: "Активных правил", value: stats.active_rules, icon: Settings, color: "text-pink-500" },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg bg-accent p-2 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Products CRUD
// ---------------------------------------------------------------------------
function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.admin.getProducts(1, 100).then(setProducts).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить товар?")) return
    await api.admin.deleteProduct(id)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} товаров</p>
        <button
          onClick={() => { setShowForm(true); setEditId(null) }}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Добавить товар
        </button>
      </div>

      {showForm && (
        <ProductForm
          editProduct={editId ? products.find((p) => p.id === editId) : undefined}
          onSaved={() => { setShowForm(false); setEditId(null); load() }}
          onCancel={() => { setShowForm(false); setEditId(null) }}
        />
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Товар</th>
                <th className="px-4 py-3 text-left font-medium">Категория</th>
                <th className="px-4 py-3 text-left font-medium">Бренд</th>
                <th className="px-4 py-3 text-left font-medium">Цена</th>
                <th className="px-4 py-3 text-left font-medium">В наличии</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/40x40?text=?" }}
                      />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.category}</td>
                  <td className="px-4 py-3">{p.brand}</td>
                  <td className="px-4 py-3">${p.price}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.in_stock ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                                 : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }`}>
                      {p.in_stock ? "Да" : "Нет"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditId(p.id); setShowForm(true) }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Редактировать"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product form (create / edit)
// ---------------------------------------------------------------------------
function ProductForm({
  editProduct,
  onSaved,
  onCancel,
}: {
  editProduct?: Product
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    sku_id: editProduct?.sku_id ?? "",
    name: editProduct?.name ?? "",
    brand: editProduct?.brand ?? "",
    category: editProduct?.category ?? "tops",
    subcategory: editProduct?.subcategory ?? "",
    gender: editProduct?.gender ?? "unisex",
    description: editProduct?.description ?? "",
    color: editProduct?.color ?? "",
    color_name: editProduct?.color_name ?? "",
    color_hex: editProduct?.color_hex ?? "#000000",
    price: editProduct?.price ?? 0,
    promo_price: editProduct?.promo_price ?? undefined as number | undefined,
    in_stock: editProduct?.in_stock ?? true,
    image_url: editProduct?.image_url ?? "",
    sizes: editProduct?.sizes?.join(", ") ?? "S, M, L, XL",
    style_tags: editProduct?.style_tags?.join(", ") ?? "",
    occasion_tags: editProduct?.occasion_tags?.join(", ") ?? "",
    material: editProduct?.material ?? "",
    season: editProduct?.season ?? "all",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const data = {
      ...form,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      style_tags: form.style_tags.split(",").map((s) => s.trim()).filter(Boolean),
      occasion_tags: form.occasion_tags.split(",").map((s) => s.trim()).filter(Boolean),
    }

    try {
      if (editProduct) {
        await api.admin.updateProduct(editProduct.id, data)
      } else {
        await api.admin.createProduct(data)
      }
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="mb-6 rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{editProduct ? "Редактировать товар" : "Новый товар"}</h3>
        <button onClick={onCancel} className="rounded-lg p-1 hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Название" value={form.name} onChange={(v) => set("name", v)} required />
        <Input label="SKU" value={form.sku_id} onChange={(v) => set("sku_id", v)} required />
        <Input label="Бренд" value={form.brand} onChange={(v) => set("brand", v)} required />

        <div>
          <label className="mb-1 block text-xs font-medium">Категория</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground">
            {["tops","bottoms","dresses","outerwear","shoes","accessories"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Input label="Подкатегория" value={form.subcategory} onChange={(v) => set("subcategory", v)} />

        <div>
          <label className="mb-1 block text-xs font-medium">Пол</label>
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground">
            {["male","female","unisex"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <Input label="Цена" type="number" value={String(form.price)} onChange={(v) => set("price", Number(v))} required />
        <Input label="Цвет (название)" value={form.color_name} onChange={(v) => set("color_name", v)} />

        <div>
          <label className="mb-1 block text-xs font-medium">Цвет (HEX)</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color_hex} onChange={(e) => set("color_hex", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border" />
            <input value={form.color_hex} onChange={(e) => set("color_hex", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>
        </div>

        <Input label="URL изображения" value={form.image_url} onChange={(v) => set("image_url", v)} />
        <Input label="Материал" value={form.material} onChange={(v) => set("material", v)} />
        <Input label="Размеры (через запятую)" value={form.sizes} onChange={(v) => set("sizes", v)} />
        <Input label="Стиль-теги (через запятую)" value={form.style_tags} onChange={(v) => set("style_tags", v)} />
        <Input label="Теги поводов (через запятую)" value={form.occasion_tags} onChange={(v) => set("occasion_tags", v)} />

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.in_stock} onChange={(e) => set("in_stock", e.target.checked)}
            className="h-4 w-4 rounded border accent-coral" />
          <label className="text-sm">В наличии</label>
        </div>

        <div className="col-span-full sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-medium">Описание</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
        </div>

        {error && (
          <div className="col-span-full rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="col-span-full flex gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            <Check className="h-4 w-4" />
            {loading ? "Сохранение..." : editProduct ? "Сохранить" : "Создать"}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-accent">
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}

function Input({
  label, value, onChange, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users panel
// ---------------------------------------------------------------------------
function UsersPanel() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.getUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">Загрузка...</div>

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-accent/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Имя</th>
            <th className="px-4 py-3 text-left font-medium">Роль</th>
            <th className="px-4 py-3 text-left font-medium">Статус</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-3">{u.id}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">{u.full_name || "—"}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  u.role === "admin"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                }`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  u.is_active ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}>
                  {u.is_active ? "Активен" : "Заблокирован"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature Flags panel
// ---------------------------------------------------------------------------
function FlagsPanel() {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.getFeatureFlags().then(setFlags).finally(() => setLoading(false))
  }, [])

  const toggle = async (key: string) => {
    const updated = { ...flags, [key]: !flags[key] }
    setFlags(updated)
    await api.admin.updateFeatureFlags({ [key]: updated[key] })
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Загрузка...</div>

  const flagLabels: Record<string, string> = {
    outfit_recommendations: "Рекомендации аутфитов",
    virtual_tryon: "Виртуальная примерка",
    conversational_stylist: "AI-стилист чат",
    show_explanations: "Показывать объяснения",
    ab_testing: "A/B тестирование",
  }

  return (
    <div className="max-w-lg space-y-3">
      {Object.entries(flags).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
          <div>
            <p className="font-medium">{flagLabels[key] || key}</p>
            <p className="text-xs text-muted-foreground">{key}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              value ? "bg-foreground" : "bg-muted"
            }`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              value ? "translate-x-5" : ""
            }`} />
          </button>
        </div>
      ))}
    </div>
  )
}
