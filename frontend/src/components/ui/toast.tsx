import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Toast as ToastType } from "@/hooks/use-toast"

interface ToastProps {
  toast: ToastType
  onDismiss: (id: string) => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 shadow-lg transition-all",
        toast.variant === "destructive"
          ? "border-destructive bg-destructive text-white"
          : "border bg-background text-foreground"
      )}
    >
      <div className="grid gap-1">
        {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
        {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-1 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
