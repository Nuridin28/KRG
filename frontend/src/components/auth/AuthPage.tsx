import { useState } from "react"
import { api } from "@/api/client"
import { useAuth } from "@/store/auth"
import { LogIn, UserPlus, Mail, Lock, User } from "lucide-react"

interface AuthPageProps {
  onSuccess: () => void
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const setAuth = useAuth((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        const { access_token } = await api.auth.login({ email, password })
        const user = await (() => {
          // Temporarily set token to fetch user
          useAuth.getState().setAuth(access_token, {} as any)
          return api.auth.me()
        })()
        setAuth(access_token, user)
      } else {
        await api.auth.register({ email, password, full_name: fullName })
        const { access_token } = await api.auth.login({ email, password })
        useAuth.getState().setAuth(access_token, {} as any)
        const user = await api.auth.me()
        setAuth(access_token, user)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message || "Произошла ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10">
              {isLogin ? <LogIn className="h-6 w-6 text-coral" /> : <UserPlus className="h-6 w-6 text-coral" />}
            </div>
            <h2 className="text-2xl font-bold">{isLogin ? "Вход" : "Регистрация"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin ? "Войдите в аккаунт" : "Создайте новый аккаунт"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Имя</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-coral focus:ring-1 focus:ring-coral"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-coral focus:ring-1 focus:ring-coral"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={4}
                  className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-coral focus:ring-1 focus:ring-coral"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-coral py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError("") }}
              className="font-medium text-coral hover:underline"
            >
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
