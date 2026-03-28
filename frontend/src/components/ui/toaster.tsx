import { Toast } from "./toast"
import type { Toast as ToastType } from "@/hooks/use-toast"

interface ToasterProps {
  toasts: ToastType[]
  dismiss: (id: string) => void
}

export function Toaster({ toasts, dismiss }: ToasterProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-[420px] flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}
