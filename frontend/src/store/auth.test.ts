import { describe, it, expect, beforeEach } from "vitest"
import { useAuth } from "./auth"

describe("useAuth store", () => {
  beforeEach(() => {
    useAuth.setState({ token: null, user: null })
  })

  it("starts logged out", () => {
    expect(useAuth.getState().token).toBeNull()
    expect(useAuth.getState().user).toBeNull()
    expect(useAuth.getState().isLoggedIn()).toBe(false)
    expect(useAuth.getState().isAdmin()).toBe(false)
  })

  it("sets auth", () => {
    useAuth.getState().setAuth("token123", {
      id: 1, email: "test@test.com", full_name: "Test", role: "user", is_active: true,
    })
    expect(useAuth.getState().token).toBe("token123")
    expect(useAuth.getState().user?.email).toBe("test@test.com")
    expect(useAuth.getState().isLoggedIn()).toBe(true)
    expect(useAuth.getState().isAdmin()).toBe(false)
  })

  it("detects admin", () => {
    useAuth.getState().setAuth("tok", {
      id: 1, email: "admin@test.com", full_name: "Admin", role: "admin", is_active: true,
    })
    expect(useAuth.getState().isAdmin()).toBe(true)
  })

  it("logs out", () => {
    useAuth.getState().setAuth("tok", {
      id: 1, email: "a@b.com", full_name: "A", role: "user", is_active: true,
    })
    useAuth.getState().logout()
    expect(useAuth.getState().token).toBeNull()
    expect(useAuth.getState().user).toBeNull()
  })
})
