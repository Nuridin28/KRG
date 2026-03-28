import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, _currency?: string): string {
  const kzt = Math.round(price * 480)
  return `${kzt.toLocaleString("ru-KZ")} ₸`
}
