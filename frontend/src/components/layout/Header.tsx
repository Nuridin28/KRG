import { useState, useEffect, useRef } from "react"
import { Sun, Moon, ShoppingBag, Wand2, Camera, MessageCircle, ShoppingBag as CartIcon, Shield, LogIn, LogOut, User, Menu, X, Heart, Puzzle, History, Shirt, CalendarDays, ChevronDown, Globe } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCart } from "@/store/cart"
import { useAuth } from "@/store/auth"
import { useT, useI18n, LANG_LABELS, type Lang } from "@/i18n"

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
  darkMode: boolean
  onToggleTheme: () => void
  onOpenCart: () => void
}

const primaryNavDef = [
  { value: "catalog", key: "catalog" as const, icon: ShoppingBag },
  { value: "stylist", key: "aiStylist" as const, icon: Wand2 },
  { value: "tryon", key: "tryOn" as const, icon: Camera },
  { value: "chat", key: "aiChat" as const, icon: MessageCircle },
]

const secondaryNavDef = [
  { value: "daily", key: "dailyOutfit" as const, icon: CalendarDays },
  { value: "wardrobe", key: "wardrobe" as const, icon: Shirt },
  { value: "builder", key: "builder" as const, icon: Puzzle },
  { value: "wishlist", key: "wishlist" as const, icon: Heart },
  { value: "history", key: "history" as const, icon: History },
]

export function Header({ activeTab, onTabChange, darkMode, onToggleTheme, onOpenCart }: HeaderProps) {
  const items = useCart((s) => s.items)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const isAdmin = useAuth((s) => s.isAdmin)
  const routerNavigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const lang = useI18n((s) => s.lang)
  const setLang = useI18n((s) => s.setLang)

  const primaryNav = primaryNavDef.map((n) => ({ ...n, label: t.nav[n.key] }))
  const secondaryNav = secondaryNavDef.map((n) => ({ ...n, label: t.nav[n.key] }))
  const allNav = [...primaryNav, ...secondaryNav]

  const isSecondaryActive = secondaryNav.some((item) => item.value === activeTab)

  useEffect(() => {
    setMobileOpen(false)
    setMoreOpen(false)
  }, [activeTab])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleNav(tab: string) {
    onTabChange(tab)
    setMobileOpen(false)
    setMoreOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <button onClick={() => onTabChange("catalog")} className="flex items-center gap-2.5 transition-opacity hover:opacity-70">
          <span className="text-lg font-bold tracking-tight sm:text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            AI Stylist
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.value
            return (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-px bg-foreground" />
                )}
              </button>
            )
          })}

          {/* "More" dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isSecondaryActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="hidden lg:inline">{t.nav.more}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} />
              {isSecondaryActive && (
                <span className="absolute bottom-0 left-3 right-3 h-px bg-foreground" />
              )}
            </button>

            {moreOpen && (
              <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background p-1 shadow-lg">
                {secondaryNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleNav(item.value)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === item.value
                          ? "bg-foreground/5 text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {isAdmin() && (
            <button
              onClick={() => onTabChange("admin")}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === "admin"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="hidden lg:inline">{t.nav.admin}</span>
              {activeTab === "admin" && (
                <span className="absolute bottom-0 left-3 right-3 h-px bg-foreground" />
              )}
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {user ? (
            <button
              onClick={() => onTabChange("profile")}
              className="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all hover:bg-accent sm:flex"
              title={t.nav.myProfile}
            >
              <User className="h-3.5 w-3.5" />
              <span className="max-w-25 truncate">{user.full_name || user.email}</span>
            </button>
          ) : null}

          {user ? (
            <button
              onClick={() => { logout(); routerNavigate("/catalog") }}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground sm:flex"
              title={t.nav.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onTabChange("auth")}
              className="hidden items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-all hover:opacity-90 sm:flex"
            >
              <LogIn className="h-4 w-4" />
              <span>{t.nav.login}</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            title={t.nav.cart}
          >
            <CartIcon className="h-4 w-4" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                {totalItems}
              </span>
            )}
          </button>

          {/* Language switcher */}
          <div className="flex items-center rounded-lg border text-xs font-medium">
            {(["ru", "en", "kz"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-1.5 py-1 transition-colors ${
                  lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                } ${l === "ru" ? "rounded-l-md" : l === "kz" ? "rounded-r-md" : ""}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            title={darkMode ? t.nav.lightTheme : t.nav.darkTheme}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Burger — mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label={t.nav.menu}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed right-0 top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-72 flex-col border-l bg-background shadow-2xl transition-all duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0 opacity-100 visible" : "translate-x-full opacity-0 invisible"
        }`}
      >
        {user && (
          <button
            onClick={() => handleNav("profile")}
            className="flex w-full items-center gap-3 border-b px-5 py-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.full_name || user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            {allNav.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  onClick={() => handleNav(item.value)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    activeTab === item.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              )
            })}

            {isAdmin() && (
              <button
                onClick={() => handleNav("admin")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "admin"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Shield className="h-5 w-5" />
                {t.nav.adminPanel}
              </button>
            )}
          </div>
        </nav>

        <div className="border-t px-3 py-3 space-y-1">
          {user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); routerNavigate("/catalog") }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
              {t.nav.logout}
            </button>
          ) : (
            <button
              onClick={() => handleNav("auth")}
              className="flex w-full items-center gap-3 rounded-lg bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90"
            >
              <LogIn className="h-5 w-5" />
              {t.nav.login}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
