import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api } from "@/api/client"
import type { ChatMessage, ChatResponse, ProductBrief, Outfit } from "@/api/types"
import { ChatMessageComponent } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNavigation } from "@/store/navigation"
import { useT } from "@/i18n"

interface MessageWithData {
  message: ChatMessage
  products: ProductBrief[]
  outfits: Outfit[]
}

export function ChatPage() {
  const t = useT()
  const navigate = useNavigate()
  const { setTryOnProducts, setTryOnFromOutfit } = useNavigation()
  const [messages, setMessages] = useState<MessageWithData[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleSend = async (text: string) => {
    const userMsg: MessageWithData = {
      message: { role: "user", content: text },
      products: [],
      outfits: [],
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history: ChatMessage[] = messages.map((m) => m.message)
      const response: ChatResponse = await api.chat.send({
        message: text,
        conversation_history: history,
      })

      const assistantMsg: MessageWithData = {
        message: { role: "assistant", content: response.answer },
        products: response.recommended_products,
        outfits: response.recommended_outfits,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: MessageWithData = {
        message: {
          role: "assistant",
          content: `${t.common.error}: ${err instanceof Error ? err.message : ""}`,
        },
        products: [],
        outfits: [],
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleTryOnProduct = useCallback((product: ProductBrief) => {
    setTryOnProducts([{
      ...product,
      sku_id: "", subcategory: "", gender: "unisex" as const,
      description: "", color: "", pattern: "", fit: "", material: "",
      currency: product.currency || "USD", sizes: [],
      style_tags: [], occasion_tags: [], season: "all", seller_id: "",
    }])
    navigate("/tryon")
  }, [navigate, setTryOnProducts])

  const handleTryOnOutfit = useCallback((outfit: Outfit) => {
    setTryOnFromOutfit(outfit)
    navigate("/tryon")
  }, [navigate, setTryOnFromOutfit])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {t.chat.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.chat.subtitle}
        </p>
      </div>

      <div className="flex flex-col rounded-xl border bg-card shadow-sm">
        <ScrollArea className="h-125">
          <div className="space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5">
                  <MessageCircle className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{t.chat.emptyTitle}</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {t.chat.emptyHint}
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="animate-fade-in-up">
                <ChatMessageComponent
                  message={m.message}
                  products={m.products}
                  outfits={m.outfits}
                  onTryOnProduct={handleTryOnProduct}
                  onTryOnOutfit={handleTryOnOutfit}
                />
              </div>
            ))}

            {loading && (
              <ChatMessageComponent
                message={{ role: "assistant", content: "" }}
                isTyping
              />
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </div>
  )
}
