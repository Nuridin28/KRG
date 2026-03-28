import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"

const SUGGESTED_PROMPTS = [
  "Подбери образ на свидание",
  "Casual лук до 100 000 ₸",
  "Офисный стиль",
  "Спортивный образ",
  "Что надеть на вечеринку?",
]

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("")

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSend(prompt)}
            disabled={disabled}
            className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-coral/40 hover:bg-coral/5 hover:text-foreground disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Спросите AI стилиста..."
          disabled={disabled}
          className="flex-1 rounded-lg border border-input bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 focus-visible:border-coral/40 disabled:opacity-50 transition-all duration-200"
        />
        <Button
          variant="coral"
          size="icon"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-lg"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
