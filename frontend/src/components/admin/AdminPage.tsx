import { useState, useEffect, useCallback } from "react"
import { api } from "@/api/client"
import { resolveMediaUrl } from "@/lib/apiEnv"
import { formatPrice } from "@/lib/utils"
import { useT } from "@/i18n"
import type { AdminStats, Product } from "@/api/types"
import type { AuthUser } from "@/store/auth"
import {
  Package, Users, BarChart3, Trash2, Plus, Edit2, X, Check,
  ShoppingBag, Shirt, Eye, TrendingUp, Settings,
} from "lucide-react"

type AdminTab = "stats" | "products" | "users" | "flags"

export function AdminPage() {
  const t = useT()
  const [tab, setTab] = useState<AdminTab>("stats")

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.admin.title}</h1>
        <p className="text-sm text-muted-foreground">{t.admin.subtitle}</p>
      </div>

      <div className="mb-6 flex gap-2">
        {([
          { id: "stats", label: t.admin.tabStats, icon: BarChart3 },
          { id: "products", label: t.admin.tabProducts, icon: Package },
          { id: "users", label: t.admin.tabUsers, icon: Users },
          { id: "flags", label: t.admin.tabFlags, icon: Settings },
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
  const t = useT()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t.common.loading}</div>
  if (!stats) return null

  const cards = [
    { label: t.admin.statsProducts, value: stats.total_products, icon: ShoppingBag, color: "text-blue-500" },
    { label: t.admin.statsUsers, value: stats.total_users, icon: Users, color: "text-green-500" },
    { label: t.admin.statsOutfits, value: stats.total_outfits_generated, icon: Shirt, color: "text-purple-500" },
    { label: t.admin.statsTryOn, value: stats.total_tryon_jobs, icon: Eye, color: "text-orange-500" },
    { label: t.admin.statsEvents, value: stats.total_events, icon: TrendingUp, color: "text-cyan-500" },
    { label: t.admin.statsRules, value: stats.active_rules, icon: Settings, color: "text-pink-500" },
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
  const t = useT()
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
    if (!confirm(t.admin.deleteConfirm)) return
    await api.admin.deleteProduct(id)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} {t.admin.tabProducts.toLowerCase()}</p>
        <button
          onClick={() => { setShowForm(true); setEditId(null) }}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {t.admin.addProduct}
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
        <div className="py-12 text-center text-muted-foreground">{t.common.loading}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t.admin.tableProduct}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.tableCategory}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.tableBrand}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.tablePrice}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.tableInStock}</th>
                <th className="px-4 py-3 text-right font-medium">{t.admin.tableActions}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveMediaUrl(p.image_url)}
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
                  <td className="px-4 py-3">{t.categories[p.category as keyof typeof t.categories] || p.category}</td>
                  <td className="px-4 py-3">{p.brand}</td>
                  <td className="px-4 py-3">{formatPrice(p.price, p.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.in_stock ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                                 : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    }`}>
                      {p.in_stock ? t.common.yes : t.common.no}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditId(p.id); setShowForm(true) }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={t.admin.editProduct}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                        title={t.common.delete}
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
  const t = useT()
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
  const [imageMode, setImageMode] = useState<"url" | "upload">(editProduct?.image_url ? "url" : "upload")
  const [uploading, setUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

  const CATEGORY_OPTIONS = [
    { value: "tops", label: t.categories.tops },
    { value: "bottoms", label: t.categories.bottoms },
    { value: "dresses", label: t.categories.dresses },
    { value: "outerwear", label: t.categories.outerwear },
    { value: "shoes", label: t.categories.shoes },
    { value: "accessories", label: t.categories.accessories },
    { value: "sets", label: t.categories.sets },
  ]

  const GENDER_OPTIONS = [
    { value: "male", label: t.genders.male },
    { value: "female", label: t.genders.female },
    { value: "unisex", label: t.genders.unisex },
  ]

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadPreview(URL.createObjectURL(file))
    try {
      const result = await api.admin.uploadImage(file)
      set("image_url", result.image_url)
    } catch (err: any) {
      setError(t.common.error + ": " + err.message)
      setUploadPreview(null)
    } finally {
      setUploading(false)
    }
  }

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

  const imagePreviewSrc = uploadPreview || form.image_url || null

  return (
    <div className="mb-6 rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{editProduct ? t.admin.editProduct : t.admin.newProduct}</h3>
        <button onClick={onCancel} className="rounded-lg p-1 hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input label={t.admin.formName} value={form.name} onChange={(v) => set("name", v)} required />
        <Input label={t.admin.formSku} value={form.sku_id} onChange={(v) => set("sku_id", v)} required />
        <Input label={t.admin.formBrand} value={form.brand} onChange={(v) => set("brand", v)} required />

        <div>
          <label className="mb-1 block text-xs font-medium">{t.admin.formCategory}</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground">
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <Input label={t.admin.formSubcategory} value={form.subcategory} onChange={(v) => set("subcategory", v)} />

        <div>
          <label className="mb-1 block text-xs font-medium">{t.admin.formGender}</label>
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground">
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <Input label={t.admin.formPrice} type="number" value={String(form.price)} onChange={(v) => set("price", Number(v))} required />
        <Input label={t.admin.formColorName} value={form.color_name} onChange={(v) => set("color_name", v)} />

        <div>
          <label className="mb-1 block text-xs font-medium">{t.admin.formColorHex}</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color_hex} onChange={(e) => set("color_hex", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border" />
            <input value={form.color_hex} onChange={(e) => set("color_hex", e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>
        </div>

        {/* Image — URL or Upload */}
        <div className="col-span-full sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-medium">{t.admin.formImage}</label>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setImageMode("url")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                imageMode === "url" ? "bg-foreground text-background" : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.admin.formImageUrl}
            </button>
            <button
              type="button"
              onClick={() => setImageMode("upload")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                imageMode === "upload" ? "bg-foreground text-background" : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.admin.formImageUpload}
            </button>
          </div>

          {imageMode === "url" ? (
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => { set("image_url", e.target.value); setUploadPreview(null) }}
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors hover:bg-accent">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    {t.common.loading}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {form.image_url && imageMode === "upload" ? t.common.reset : t.admin.formImageUpload}
                  </>
                )}
              </label>
              {form.image_url && imageMode === "upload" && (
                <span className="text-xs text-emerald-600">{t.common.done}</span>
              )}
            </div>
          )}

          {/* Preview */}
          {imagePreviewSrc && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={resolveMediaUrl(imagePreviewSrc)}
                alt="Preview"
                className="h-16 w-16 rounded-lg border object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
              <span className="max-w-xs truncate text-xs text-muted-foreground">{form.image_url}</span>
            </div>
          )}
        </div>

        <Input label={t.admin.formMaterial} value={form.material} onChange={(v) => set("material", v)} />
        <Input label={t.admin.formSizes} value={form.sizes} onChange={(v) => set("sizes", v)} />
        <Input label={t.admin.formStyleTags} value={form.style_tags} onChange={(v) => set("style_tags", v)} />
        <Input label={t.admin.formOccasionTags} value={form.occasion_tags} onChange={(v) => set("occasion_tags", v)} />

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.in_stock} onChange={(e) => set("in_stock", e.target.checked)}
            className="h-4 w-4 rounded border" />
          <label className="text-sm">{t.admin.formInStock}</label>
        </div>

        <div className="col-span-full sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-medium">{t.admin.formDescription}</label>
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
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
            <Check className="h-4 w-4" />
            {loading ? t.common.saving : editProduct ? t.common.save : t.admin.create}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-accent">
            {t.common.cancel}
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
  const t = useT()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.getUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t.common.loading}</div>

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-accent/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">{t.auth.nameLabel}</th>
            <th className="px-4 py-3 text-left font-medium">Role</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
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
                  {u.is_active ? t.admin.userActive : t.admin.userBlocked}
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
  const t = useT()
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

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t.common.loading}</div>

  return (
    <div className="max-w-lg space-y-3">
      {Object.entries(flags).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-xl border bg-card px-5 py-4">
          <div>
            <p className="font-medium">{key}</p>
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
