import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme, type ThemeMode } from "@/theme/context"
import { useI18n } from "@/i18n/context"
import { cn } from "@/lib/utils"

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const { t } = useI18n()
  const modes: ThemeMode[] = ["light", "dark", "system"]

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card/60 p-0.5 backdrop-blur">
      {modes.map((m) => {
        const Icon = ICONS[m]
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={active}
            aria-label={t.theme[m]}
            title={t.theme[m]}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
