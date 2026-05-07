import { useState, useEffect, useRef } from "react"
import { Sun, Moon, Wand2, Camera, MessageCircle, ShoppingBag as CartIcon, Shield, LogIn, LogOut, User, Menu, X, Heart, Puzzle, History, Shirt, CalendarDays, ChevronDown } from "lucide-react"
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
  { value: "catalog", key: "catalog" as const },
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
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function handleNav(tab: string) {
    onTabChange(tab)
    setMobileOpen(false)
    setMoreOpen(false)
  }

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-border/70 bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-background"
      }`}
    >
      {/* Announcement strip */}
      <div className="hidden border-b border-border/40 bg-foreground text-background sm:block">
        <div className="mx-auto flex h-8 max-w-350 items-center justify-between px-6 text-[11px] tracking-[0.18em] uppercase font-medium">
          <span className="hidden md:inline opacity-80">Complimentary shipping on orders above ₸ 25 000</span>
          <span className="opacity-90">New arrivals · SS26 collection</span>
          <span className="hidden md:inline opacity-80">Atelier Almaty · Astana</span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-350 items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-10">
        {/* Logo */}
        <button
          onClick={() => onTabChange("catalog")}
          className="group flex items-baseline gap-2 transition-opacity hover:opacity-80"
          aria-label="Home"
        >
          <span className="font-display text-2xl font-semibold leading-none tracking-tight sm:text-[28px]">
            Atelier
          </span>
          <span className="font-display text-xl italic font-light leading-none text-foreground/70 sm:text-[22px]">
            Stylist
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => {
            const active = activeTab === item.value
            return (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={`relative px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                  active ? "text-foreground" : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {item.label}
                <span
                  className={`pointer-events-none absolute -bottom-0.5 left-3 right-3 h-px bg-foreground origin-left transition-transform duration-500 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            )
          })}

          {/* "More" dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                isSecondaryActive ? "text-foreground" : "text-foreground/55 hover:text-foreground"
              }`}
            >
              {t.nav.more}
              <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${moreOpen ? "rotate-180" : ""}`} />
              <span
                className={`pointer-events-none absolute -bottom-0.5 left-3 right-6 h-px bg-foreground origin-left transition-transform duration-500 ${
                  isSecondaryActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>

            {moreOpen && (
              <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-56 border border-border/60 bg-card p-1 shadow-xl">
                {secondaryNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleNav(item.value)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors ${
                        activeTab === item.value
                          ? "bg-foreground/4 text-foreground"
                          : "text-foreground/65 hover:bg-foreground/4 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
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
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                activeTab === "admin" ? "text-foreground" : "text-foreground/55 hover:text-foreground"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.nav.admin}</span>
              <span
                className={`pointer-events-none absolute -bottom-0.5 left-3 right-3 h-px bg-foreground origin-left transition-transform duration-500 ${
                  activeTab === "admin" ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {user ? (
            <button
              onClick={() => onTabChange("profile")}
              className="hidden items-center gap-2 px-2 py-1.5 text-[11px] uppercase tracking-[0.16em] text-foreground/65 transition-colors hover:text-foreground sm:flex"
              title={t.nav.myProfile}
            >
              <User className="h-3.5 w-3.5" />
              <span className="max-w-24 truncate normal-case tracking-normal">{user.full_name || user.email}</span>
            </button>
          ) : null}

          {user ? (
            <button
              onClick={() => { logout(); routerNavigate("/catalog") }}
              className="hidden h-9 w-9 items-center justify-center text-foreground/55 transition-colors hover:text-foreground sm:flex"
              title={t.nav.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onTabChange("auth")}
              className="hidden items-center gap-2 bg-foreground px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-background transition-all hover:bg-foreground/90 sm:flex"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{t.nav.login}</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="relative flex h-9 w-9 items-center justify-center text-foreground/65 transition-colors hover:text-foreground"
            title={t.nav.cart}
          >
            <CartIcon className="h-4.5 w-4.5" strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute right-0.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background">
                {totalItems}
              </span>
            )}
          </button>

          {/* Language */}
          <div className="hidden items-center divide-x divide-border/60 border border-border/60 text-[10px] font-medium uppercase tracking-[0.14em] sm:flex">
            {(["ru", "en", "kz"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1.5 transition-colors ${
                  lang === l ? "bg-foreground text-background" : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center text-foreground/65 transition-colors hover:text-foreground"
            title={darkMode ? t.nav.lightTheme : t.nav.darkTheme}
          >
            {darkMode ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
          </button>

          {/* Burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center text-foreground/65 transition-colors hover:text-foreground md:hidden"
            aria-label={t.nav.menu}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 z-30 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed right-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-80 max-w-[85vw] flex-col border-l border-border/60 bg-background shadow-2xl transition-all duration-500 ease-out md:hidden ${
          mobileOpen ? "translate-x-0 opacity-100 visible" : "translate-x-full opacity-0 invisible"
        }`}
      >
        {user && (
          <button
            onClick={() => handleNav("profile")}
            className="flex w-full items-center gap-3 border-b border-border/60 px-6 py-5 text-left transition-colors hover:bg-foreground/3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
              <User className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm">{user.full_name || user.email}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{user.email}</p>
            </div>
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <p className="px-4 py-2 eyebrow text-foreground/50">{t.nav.menu}</p>
          <div className="space-y-px">
            {allNav.map((item) => {
              const Icon = (item as { icon?: typeof Wand2 }).icon
              return (
                <button
                  key={item.value}
                  onClick={() => handleNav(item.value)}
                  className={`flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === item.value
                      ? "bg-foreground text-background"
                      : "text-foreground/75 hover:bg-foreground/4 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
                    {item.label}
                  </span>
                </button>
              )
            })}

            {isAdmin() && (
              <button
                onClick={() => handleNav("admin")}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors ${
                  activeTab === "admin"
                    ? "bg-foreground text-background"
                    : "text-foreground/75 hover:bg-foreground/4 hover:text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" strokeWidth={1.5} />
                {t.nav.adminPanel}
              </button>
            )}
          </div>

          <div className="mt-6 px-4">
            <p className="eyebrow text-foreground/50 mb-3">Language</p>
            <div className="flex divide-x divide-border/60 border border-border/60 text-[11px] uppercase tracking-[0.14em]">
              {(["ru", "en", "kz"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 px-3 py-2 transition-colors ${
                    lang === l ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-border/60 px-2 py-3">
          {user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); routerNavigate("/catalog") }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/65 transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              {t.nav.logout}
            </button>
          ) : (
            <button
              onClick={() => handleNav("auth")}
              className="flex w-full items-center justify-center gap-3 bg-foreground px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-foreground/90"
            >
              <LogIn className="h-4 w-4" />
              {t.nav.login}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
