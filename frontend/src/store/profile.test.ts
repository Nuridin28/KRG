import { describe, it, expect, beforeEach } from "vitest"
import { useProfile } from "./profile"

describe("useProfile store", () => {
  beforeEach(() => {
    useProfile.setState({ photos: [] })
  })

  it("starts with no photos", () => {
    expect(useProfile.getState().photos).toEqual([])
    expect(useProfile.getState().hasPhotos()).toBe(false)
  })

  it("adds photo", () => {
    useProfile.getState().addPhoto({
      id: 1, image_url: "/photo.jpg", is_default: true, created_at: "",
    })
    expect(useProfile.getState().photos).toHaveLength(1)
    expect(useProfile.getState().hasPhotos()).toBe(true)
  })

  it("finds default photo", () => {
    useProfile.getState().setPhotos([
      { id: 1, image_url: "/a.jpg", is_default: false, created_at: "" },
      { id: 2, image_url: "/b.jpg", is_default: true, created_at: "" },
    ])
    expect(useProfile.getState().defaultPhoto()?.id).toBe(2)
  })

  it("removes photo", () => {
    useProfile.getState().setPhotos([
      { id: 1, image_url: "/a.jpg", is_default: true, created_at: "" },
    ])
    useProfile.getState().removePhoto(1)
    expect(useProfile.getState().photos).toHaveLength(0)
  })
})
