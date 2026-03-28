import { useState, useRef, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { api } from "@/api/client"
import type { ChatMessage, ChatResponse, ProductBrief, Outfit } from "@/api/types"
import { ChatMessageComponent } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MessageWithData {
  message: ChatMessage
  products: ProductBrief[]
  outfits: Outfit[]
}

export function ChatPage() {
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
          content: `Извините, произошла ошибка: ${err instanceof Error ? err.message : "Попробуйте позже"}`,
        },
        products: [],
        outfits: [],
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          AI Чат
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Общайтесь с AI стилистом и получайте персональные рекомендации
        </p>
      </div>

      <div className="flex flex-col rounded-xl border bg-card shadow-sm">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10">
                  <MessageCircle className="h-7 w-7 text-coral/60" />
                </div>
                <p className="text-sm font-medium">Начните диалог с AI стилистом</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Задайте вопрос о стиле, попросите подобрать образ или получить рекомендации по
                  гардеробу
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="animate-fade-in-up">
                <ChatMessageComponent
                  message={m.message}
                  products={m.products}
                  outfits={m.outfits}
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
