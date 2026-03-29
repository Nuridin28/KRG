import { useState, useCallback, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { CatalogPage } from "@/components/catalog/CatalogPage"
import { StylistPage } from "@/components/stylist/StylistPage"
import { TryOnPage } from "@/components/tryon/TryOnPage"
import { ChatPage } from "@/components/chat/ChatPage"
import { AuthPage } from "@/components/auth/AuthPage"
import { AdminPage } from "@/components/admin/AdminPage"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/store/auth"
import { useNavigation } from "@/store/navigation"
import type { Product, Outfit } from "@/api/types"

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [cartOpen, setCartOpen] = useState(false)
  const { toasts, toast, dismiss } = useToast()
  const user = useAuth((s) => s.user)
  const isAdmin = useAuth((s) => s.isAdmin)
  const { setAnchorProduct, setTryOnProducts, setTryOnFromOutfit } = useNavigation()

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
    localStorage.setItem("theme", darkMode ? "dark" : "light")
  }, [darkMode])

  const toggleTheme = useCallback(() => setDarkMode((prev) => !prev), [])

  // Get active tab from current path
  const pathToTab: Record<string, string> = {
    "/": "catalog",
    "/catalog": "catalog",
    "/stylist": "stylist",
    "/tryon": "tryon",
    "/chat": "chat",
    "/auth": "auth",
    "/admin": "admin",
  }
  const activeTab = pathToTab[location.pathname] || "catalog"

  const handleTabChange = useCallback((tab: string) => {
    const tabToPath: Record<string, string> = {
      catalog: "/catalog",
      stylist: "/stylist",
      tryon: "/tryon",
      chat: "/chat",
      auth: "/auth",
      admin: "/admin",
    }
    navigate(tabToPath[tab] || "/catalog")
  }, [navigate])

  const handleTryOn = useCallback(
    (product: Product) => {
      setTryOnProducts([product])
      navigate("/tryon")
      toast({ title: "Товар выбран для примерки", description: product.name })
    },
    [navigate, toast, setTryOnProducts]
  )

  const handleTryOnOutfit = useCallback(
    (outfit: Outfit) => {
      setTryOnFromOutfit(outfit)
      navigate("/tryon")
      toast({ title: "Образ выбран для примерки", description: `${outfit.items.length} вещей` })
    },
    [navigate, toast, setTryOnFromOutfit]
  )

  const handleBuildOutfit = useCallback(
    (product: Product) => {
      setAnchorProduct(product)
      navigate("/stylist")
      toast({ title: "Подбор образа", description: `Создаём образ на основе: ${product.name}` })
    },
    [navigate, toast, setAnchorProduct]
  )

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<CatalogPage onTryOn={handleTryOn} onBuildOutfit={handleBuildOutfit} />} />
          <Route path="/stylist" element={<StylistPage onTryOnOutfit={handleTryOnOutfit} />} />
          <Route path="/tryon" element={<TryOnPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/auth" element={user ? <Navigate to="/catalog" replace /> : <AuthPage onSuccess={() => navigate("/catalog")} />} />
          <Route path="/admin" element={isAdmin() ? <AdminPage /> : <Navigate to="/catalog" replace />} />
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Routes>
      </main>

      <Footer />
      <Toaster toasts={toasts} dismiss={dismiss} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
