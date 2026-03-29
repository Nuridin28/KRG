import { Sparkles } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Stylist &copy; {new Date().getFullYear()}</span>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Powered by Vertex AI & OpenAI
        </p>
      </div>
    </footer>
  )
}
