import type { ru } from "./ru"

/** Same nested shape as `ru`, but string fields are `string` so every locale can supply its own copy. */
type DeepStringify<T> = T extends string
  ? string
  : { [K in keyof T]: DeepStringify<T[K]> }

export type Translations = DeepStringify<typeof ru>
export type Lang = "ru" | "en" | "kz"
