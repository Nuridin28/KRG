import { useState, useCallback, useRef } from "react"
import { Sparkles, Wand2, Shirt, User, ArrowRight } from "lucide-react"
import { ImageDropzone } from "@/components/ImageDropzone"
import { Result } from "@/components/Result"
import { startAnonymousTryOn, pollTryOn } from "@/lib/api"
import { cn } from "@/lib/utils"

type Status = "idle" | "processing" | "success" | "error"

export default function App() {
  const [personFile, setPersonFile] = useState<File | null>(null)
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [progress, setProgress] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ready = personFile && garmentFile && status !== "processing"

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStatus("idle")
    setProgress(0)
    setResultUrl(null)
    setError(null)
    setCurrentStep(null)
  }, [])

  const startOver = useCallback(() => {
    reset()
    setPersonFile(null)
    setGarmentFile(null)
  }, [reset])

  const handleSubmit = useCallback(async () => {
    if (!personFile || !garmentFile) return
    setStatus("processing")
    setProgress(5)
    setResultUrl(null)
    setError(null)
    setCurrentStep(null)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const job = await startAnonymousTryOn(personFile, garmentFile)
      const finalJob = await pollTryOn(job.job_id, {
        signal: controller.signal,
        onUpdate: (j) => {
          setProgress(j.progress ?? 0)
          if (j.current_step) setCurrentStep(j.current_step)
        },
      })
      setResultUrl(finalJob.output_image_url ?? null)
      setStatus("success")
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setError((e as Error).message || "Что-то пошло не так")
      setStatus("error")
    }
  }, [personFile, garmentFile])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[420px] rounded-full bg-accent/20 blur-3xl animate-blob" />
        <div
          className="absolute -bottom-40 right-0 size-[480px] rounded-full bg-foreground/10 blur-3xl animate-blob"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            Try-On
          </span>
        </div>
        <a
          href="#how"
          className="hidden text-sm text-muted-foreground hover:text-foreground transition sm:block"
        >
          Как это работает
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* Hero */}
        <section className="pt-8 pb-12 text-center sm:pt-16 sm:pb-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Wand2 className="size-3" />
            <span>Powered by Vertex AI · Бесплатно · Без регистрации</span>
          </div>
          <h1 className="mt-6 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Примерь любую одежду
            <br />
            <span className="bg-gradient-to-r from-accent to-foreground bg-clip-text text-transparent">
              за пару секунд
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Загрузите своё фото и фото одежды — ИИ соберёт реалистичную примерку.
            Без сохранения данных.
          </p>
        </section>

        {/* Try-on grid */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
          <ImageDropzone
            label="1. Ваше фото"
            description="В полный рост, лицом к камере"
            file={personFile}
            onChange={setPersonFile}
            accent="person"
          />
          <ImageDropzone
            label="2. Одежда"
            description="Чёткое фото на белом фоне"
            file={garmentFile}
            onChange={setGarmentFile}
            accent="garment"
          />
          <Result
            status={status}
            progress={progress}
            imageUrl={resultUrl}
            error={error}
            currentStep={currentStep}
            onReset={startOver}
          />
        </section>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!ready}
            className={cn(
              "group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-medium transition sm:w-auto",
              "bg-foreground text-background hover:opacity-90 active:scale-[0.99]",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40",
            )}
          >
            {status === "processing" ? "Идёт примерка…" : "Примерить"}
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </button>
          {(personFile || garmentFile) && status !== "processing" && (
            <button
              type="button"
              onClick={startOver}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Очистить всё
            </button>
          )}
        </div>

        {/* How it works */}
        <section id="how" className="mt-24 sm:mt-32">
          <h2 className="text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Три шага до результата
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: User,
                title: "Загрузите своё фото",
                desc: "В полный рост, на однотонном фоне — для лучшего результата.",
              },
              {
                icon: Shirt,
                title: "Добавьте одежду",
                desc: "Скриншот или фото вещи. Чем чище фон, тем точнее примерка.",
              },
              {
                icon: Sparkles,
                title: "Получите результат",
                desc: "ИИ сгенерирует фото за 15–40 секунд. Скачайте и делитесь.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 transition hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="size-4" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-border px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} Try-On. Без сохранения ваших фото.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            Сервис работает
          </span>
        </div>
      </footer>
    </div>
  )
}
