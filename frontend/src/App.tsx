import { useState, useCallback, useEffect } from "react"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { CatalogPage } from "@/components/catalog/CatalogPage"
import { StylistPage } from "@/components/stylist/StylistPage"
import { TryOnPage } from "@/components/tryon/TryOnPage"
import { ChatPage } from "@/components/chat/ChatPage"
import { AuthPage } from "@/components/auth/AuthPage"
import { AdminPage } from "@/components/admin/AdminPage"
import StyleQuiz from "@/components/quiz/StyleQuiz"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/store/auth"
import type { Product } from "@/api/types"

type TabValue = "catalog" | "stylist" | "tryon" | "chat" | "quiz" | "auth" | "admin"

function App() {
  const [activeTab, setActiveTab] = useState<TabValue>("catalog")
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { toasts, toast, dismiss } = useToast()
  const user = useAuth((s) => s.user)
  const isAdmin = useAuth((s) => s.isAdmin)
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

  // Redirect away from admin if not admin
  useEffect(() => {
    if (activeTab === "admin" && !isAdmin()) {
      setActiveTab("catalog")
    }
  }, [activeTab, isAdmin, user])

  // Redirect away from auth if logged in
  useEffect(() => {
    if (activeTab === "auth" && user) {
      setActiveTab("catalog")
    }
  }, [activeTab, user])

  const handleTryOn = useCallback(
    (product: Product) => {
      setSelectedProduct(product)
      setActiveTab("tryon")
      toast({
        title: "Товар выбран для примерки",
        description: product.name,
      })
    },
    [toast]
  )

  const handleTryOnById = useCallback(
    (_productId: string) => {
      setActiveTab("tryon")
      toast({
        title: "Переход к примерке",
        description: "Загрузите фото для виртуальной примерки",
      })
    },
    [toast]
  )

  const handleBuildOutfit = useCallback(
    (product: Product) => {
      setSelectedProduct(product)
      setActiveTab("stylist")
      toast({
        title: "Подбор образа",
        description: `Создаём образ на основе: ${product.name}`,
      })
    },
    [toast]
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabValue)}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeTab === "catalog" && (
          <CatalogPage onTryOn={handleTryOn} onBuildOutfit={handleBuildOutfit} />
        )}
        {activeTab === "stylist" && (
          <StylistPage anchorProduct={selectedProduct} onTryOn={handleTryOnById} />
        )}
        {activeTab === "tryon" && <TryOnPage selectedProduct={selectedProduct} />}
        {activeTab === "chat" && <ChatPage />}
        {activeTab === "quiz" && (
          <StyleQuiz onComplete={() => setActiveTab("stylist")} />
        )}
        {activeTab === "auth" && (
          <AuthPage onSuccess={() => setActiveTab("catalog")} />
        )}
        {activeTab === "admin" && isAdmin() && <AdminPage />}
      </main>

      <Footer />
      <Toaster toasts={toasts} dismiss={dismiss} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}

export default App
