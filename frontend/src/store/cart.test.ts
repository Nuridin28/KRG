import { describe, it, expect, beforeEach } from "vitest"
import { useCart } from "./cart"
import type { ProductBrief } from "@/api/types"

const mockProduct = (id: string, price: number): ProductBrief => ({
  id, name: `Product ${id}`, brand: "Test", category: "tops",
  color_hex: "#000", color_name: "Black", price, image_url: "", in_stock: true,
})

describe("useCart store", () => {
  beforeEach(() => {
    useCart.setState({ items: [] })
  })

  it("starts empty", () => {
    expect(useCart.getState().items).toEqual([])
    expect(useCart.getState().totalPrice()).toBe(0)
    expect(useCart.getState().totalItems()).toBe(0)
  })

  it("adds item", () => {
    useCart.getState().addItem(mockProduct("p1", 50))
    expect(useCart.getState().items).toHaveLength(1)
    expect(useCart.getState().items[0].quantity).toBe(1)
  })

  it("increments quantity on duplicate", () => {
    useCart.getState().addItem(mockProduct("p1", 50))
    useCart.getState().addItem(mockProduct("p1", 50))
    expect(useCart.getState().items).toHaveLength(1)
    expect(useCart.getState().items[0].quantity).toBe(2)
  })

  it("removes item", () => {
    useCart.getState().addItem(mockProduct("p1", 50))
    useCart.getState().removeItem("p1")
    expect(useCart.getState().items).toHaveLength(0)
  })

  it("calculates total price", () => {
    useCart.getState().addItem(mockProduct("p1", 30))
    useCart.getState().addItem(mockProduct("p2", 70))
    expect(useCart.getState().totalPrice()).toBe(100)
  })

  it("calculates total items", () => {
    useCart.getState().addItem(mockProduct("p1", 30))
    useCart.getState().addItem(mockProduct("p1", 30))
    useCart.getState().addItem(mockProduct("p2", 70))
    expect(useCart.getState().totalItems()).toBe(3)
  })

  it("clears cart", () => {
    useCart.getState().addItem(mockProduct("p1", 30))
    useCart.getState().clearCart()
    expect(useCart.getState().items).toHaveLength(0)
  })

  it("adds outfit", () => {
    useCart.getState().addOutfit([mockProduct("p1", 30), mockProduct("p2", 70)])
    expect(useCart.getState().items).toHaveLength(2)
  })

  it("updates quantity", () => {
    useCart.getState().addItem(mockProduct("p1", 50))
    useCart.getState().updateQuantity("p1", 5)
    expect(useCart.getState().items[0].quantity).toBe(5)
  })
})
