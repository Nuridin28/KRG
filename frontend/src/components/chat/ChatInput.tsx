import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const t = useT()
  const [value, setValue] = useState("")

  const SUGGESTED_PROMPTS = [
    t.chat.suggestDate,
    t.chat.suggestCasual,
    t.chat.suggestOffice,
    t.chat.suggestSport,
    t.chat.suggestParty,
  ]

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
            className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-foreground/40 hover:bg-foreground/3 hover:text-foreground disabled:opacity-50"
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
          placeholder={t.chat.inputPlaceholder}
          disabled={disabled}
          className="flex-1 rounded-lg border border-input bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:border-foreground/40 disabled:opacity-50 transition-all duration-200"
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
