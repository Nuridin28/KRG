import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency?: string): string {
  const cur = (currency || "USD").toUpperCase()
  if (cur === "KZT") {
    return `${Math.round(price).toLocaleString("ru-KZ")} ₸`
  }
  // Convert USD to KZT for display
  const kzt = Math.round(price * 480)
  return `${kzt.toLocaleString("ru-KZ")} ₸`
}
