import { Sparkles, Sun, Moon, ShoppingBag, Wand2, Camera, MessageCircle, ShoppingBag as CartIcon, ClipboardList } from "lucide-react"
import { useCart } from "@/store/cart"

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
  { value: "quiz", label: "Стиль-Квиз", icon: ClipboardList },
]

export function Header({ activeTab, onTabChange, darkMode, onToggleTheme, onOpenCart }: HeaderProps) {
  const items = useCart((s) => s.items)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral/10">
            <Sparkles className="h-5 w-5 text-coral" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            AI Stylist
          </span>
        </div>

        <nav className="flex items-center gap-1">
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
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenCart}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Корзина"
          >
            <CartIcon className="h-[18px] w-[18px]" />
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
            {darkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
    </header>
  )
}
