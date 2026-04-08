import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency?: string): string {
  const cur = (currency || "USD").toUpperCase()
  // If already in KZT or price looks like KZT (> 1000), display directly
  if (cur === "KZT" || price >= 1000) {
    return `${Math.round(price).toLocaleString("ru-KZ")} ₸`
  }
  // Convert USD to KZT for display
  const kzt = Math.round(price * 480)
  return `${kzt.toLocaleString("ru-KZ")} ₸`
}
