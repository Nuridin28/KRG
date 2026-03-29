import { useState, useEffect } from "react"
import { Sparkles, Sun, Moon, ShoppingBag, Wand2, Camera, MessageCircle, ShoppingBag as CartIcon, Shield, LogIn, LogOut, User, Menu, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCart } from "@/store/cart"
import { useAuth } from "@/store/auth"

interface HeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
  darkMode: boolean
  onToggleTheme: () => void
  onOpenCart: () => void
}

const navItems = [
  { value: "catalog", label: "Каталог", icon: ShoppingBag },
  { value: "stylist", label: "AI Стилист", icon: Wand2 },
  { value: "tryon", label: "Примерка", icon: Camera },
  { value: "chat", label: "AI Чат", icon: MessageCircle },
]

export function Header({ activeTab, onTabChange, darkMode, onToggleTheme, onOpenCart }: HeaderProps) {
  const items = useCart((s) => s.items)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const isAdmin = useAuth((s) => s.isAdmin)
  const routerNavigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [activeTab])

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  function handleNav(tab: string) {
    onTabChange(tab)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <button onClick={() => onTabChange("catalog")} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral/10 sm:h-9 sm:w-9">
            <Sparkles className="h-4 w-4 text-coral sm:h-5 sm:w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight sm:text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            AI Stylist
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === item.value
                    ? "bg-coral text-white shadow-sm shadow-coral/25"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            )
          })}

          {isAdmin() && (
            <button
              onClick={() => onTabChange("admin")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === "admin"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950"
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="hidden lg:inline">Админ</span>
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {user ? (
            <div className="hidden items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs sm:flex">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-25 truncate">{user.full_name || user.email}</span>
              {user.role === "admin" && (
                <span className="rounded bg-purple-100 px-1 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                  admin
                </span>
              )}
            </div>
          ) : null}

          {user ? (
            <button
              onClick={() => { logout(); routerNavigate("/catalog") }}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
              title="Выйти"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          ) : (
            <button
              onClick={() => onTabChange("auth")}
              className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex ${
                activeTab === "auth"
                  ? "bg-coral text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Войти</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Корзина"
          >
            <CartIcon className="h-4.5 w-4.5" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>

          <button
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={darkMode ? "Светлая тема" : "Тёмная тема"}
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* Burger button — mobile only */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Меню"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-14 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out menu */}
      <div
        className={`fixed right-0 top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-72 flex-col border-l bg-background shadow-xl transition-all duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0 opacity-100 visible" : "translate-x-full opacity-0 invisible"
        }`}
      >
        {/* User info (mobile) */}
        {user && (
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-coral">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.full_name || user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            {user.role === "admin" && (
              <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                admin
              </span>
            )}
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  onClick={() => handleNav(item.value)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === item.value
                      ? "bg-coral text-white shadow-sm shadow-coral/25"
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "admin"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950"
                }`}
              >
                <Shield className="h-5 w-5" />
                Админ-панель
              </button>
            )}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="border-t px-3 py-3 space-y-1">
          {user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); routerNavigate("/catalog") }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-5 w-5" />
              Выйти
            </button>
          ) : (
            <button
              onClick={() => handleNav("auth")}
              className="flex w-full items-center gap-3 rounded-lg bg-coral px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coral/90"
            >
              <LogIn className="h-5 w-5" />
              Войти
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
