import { describe, it, expect } from "vitest"
import { cn, formatPrice } from "./utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible")
  })

  it("deduplicates tailwind classes", () => {
    expect(cn("px-4", "px-6")).toBe("px-6")
  })
})

describe("formatPrice", () => {
  it("formats USD as KZT", () => {
    const result = formatPrice(100, "USD")
    expect(result).toContain("₸")
    expect(result).toContain("48")  // 100 * 480 = 48,000
  })

  it("formats KZT directly", () => {
    const result = formatPrice(5000, "KZT")
    expect(result).toContain("₸")
    expect(result).toContain("5")
  })

  it("defaults to USD conversion", () => {
    const result = formatPrice(50)
    expect(result).toContain("₸")
  })
})
