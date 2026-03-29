import { describe, it, expect, beforeEach } from "vitest"
import { useWardrobe } from "./wardrobe"

describe("useWardrobe store", () => {
  beforeEach(() => {
    useWardrobe.setState({ items: [] })
  })

  it("starts empty", () => {
    expect(useWardrobe.getState().items).toEqual([])
  })

  it("adds item", () => {
    useWardrobe.getState().addItem({
      id: 1, product_id: "top-001", category: "tops", name: "Shirt",
      color_name: "White", color_hex: "#FFF", image_url: "", style_tags: [], created_at: "",
    })
    expect(useWardrobe.getState().items).toHaveLength(1)
  })

  it("removes item", () => {
    useWardrobe.getState().addItem({
      id: 1, product_id: "top-001", category: "tops", name: "Shirt",
      color_name: "White", color_hex: "#FFF", image_url: "", style_tags: [], created_at: "",
    })
    useWardrobe.getState().removeItem(1)
    expect(useWardrobe.getState().items).toHaveLength(0)
  })

  it("checks product existence", () => {
    useWardrobe.getState().addItem({
      id: 1, product_id: "top-001", category: "tops", name: "Shirt",
      color_name: "White", color_hex: "#FFF", image_url: "", style_tags: [], created_at: "",
    })
    expect(useWardrobe.getState().hasProduct("top-001")).toBe(true)
    expect(useWardrobe.getState().hasProduct("top-999")).toBe(false)
  })
})
