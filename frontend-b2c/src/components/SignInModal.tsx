import { useEffect, useRef, useState } from "react"
import { Mail, X, Loader2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/context"
import { useAuth } from "@/auth/context"
import { requestEmailCode, verifyEmailCode } from "@/lib/api"

interface SignInModalProps {
  open: boolean
  onClose: () => void
  reason?: "freeExhausted" | "manual"
}

type Step = "email" | "code"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignInModal({ open, onClose, reason = "manual" }: SignInModalProps) {
  const { t } = useI18n()
  const { setToken } = useAuth()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!EMAIL_REGEX.test(email)) {
      setError(t.signin.invalidEmail)
      return
    }
    setLoading(true)
    try {
      const { devCode: dc } = await requestEmailCode(email)
      setDevCode(dc ?? null)
      setStep("code")
    } catch (err) {
      setError((err as Error).message || t.signin.errorSend)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code)) {
      setError(t.signin.invalidCode)
      return
    }
    setLoading(true)
    try {
      const { token } = await verifyEmailCode(email, code)
      setToken(token, email)
      onClose()
    } catch (err) {
      setError((err as Error).message || t.signin.errorVerify)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full sm:w-[440px] sm:max-w-[calc(100vw-2rem)]",
          "rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl",
          "p-6 sm:p-8 animate-in",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.signin.close}
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <X className="size-4" />
        </button>

        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Mail className="size-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
          {step === "email" ? t.signin.titleEmail : t.signin.titleCode}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {reason === "freeExhausted" && step === "email"
            ? t.signin.freeExhausted
            : step === "email"
              ? t.signin.subtitleEmail
              : t.signin.subtitleCode.replace("{email}", email)}
        </p>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="mt-6 flex flex-col gap-3">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="b2c-email">
              {t.signin.emailLabel}
            </label>
            <input
              id="b2c-email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-3 text-base",
                "outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30",
              )}
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {t.signin.sendCode} <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="mt-6 flex flex-col gap-3">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="b2c-code">
              {t.signin.codeLabel}
            </label>
            <input
              id="b2c-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className={cn(
                "w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-xl font-mono tracking-[0.5em]",
                "outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30",
              )}
            />
            {devCode && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span className="font-mono">{devCode}</span> — {t.signin.devHint}
              </p>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {t.signin.verify} <ArrowRight className="size-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              ← {t.signin.changeEmail}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
