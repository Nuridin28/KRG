import { useState } from "react"
import { ArrowRight } from "lucide-react"

export function Footer() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const year = new Date().getFullYear()

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setEmail("")
    setTimeout(() => setSubscribed(false), 4000)
  }

  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      {/* Newsletter banner */}
      <div className="border-b border-border/60">
        <div className="mx-auto grid max-w-350 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-20">
          <div>
            <p className="eyebrow text-foreground/50 mb-4">Newsletter</p>
            <h2 className="font-display text-3xl leading-[1.05] tracking-tight sm:text-4xl lg:text-[44px]">
              Personal style,
              <br />
              <span className="italic font-light text-foreground/70">delivered weekly.</span>
            </h2>
          </div>
          <div className="flex flex-col justify-end">
            <p className="mb-6 max-w-md text-sm leading-relaxed text-foreground/65">
              Edits from our atelier, AI-curated drops, and access to private appointments —
              straight to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex max-w-md items-end border-b border-foreground/30 pb-1 transition-colors focus-within:border-foreground">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-transparent py-2 text-sm placeholder:text-foreground/40 focus:outline-none"
              />
              <button
                type="submit"
                className="ml-3 flex items-center gap-2 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-70"
              >
                {subscribed ? "Thank you" : "Subscribe"}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </form>
            <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-foreground/40">
              By subscribing you agree to our privacy policy
            </p>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-350 gap-12 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-10">
        <div className="lg:col-span-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold leading-none tracking-tight">Atelier</span>
            <span className="font-display text-xl italic font-light leading-none text-foreground/70">Stylist</span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground/65">
            An atelier of AI-assisted dressing — visual styling, virtual fittings, and a
            considered edit of contemporary fashion.
          </p>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em]">
            {["Instagram", "Pinterest", "TikTok", "YouTube"].map((label) => (
              <a
                key={label}
                href="#"
                className="link-underline text-foreground/70 transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow text-foreground/50 mb-5">Shop</p>
          <ul className="space-y-3 text-sm">
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">New Arrivals</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Collections</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Designers</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Sale</a></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow text-foreground/50 mb-5">Atelier</p>
          <ul className="space-y-3 text-sm">
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">AI Stylist</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Virtual Try-On</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Wardrobe</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Personal Appointments</a></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow text-foreground/50 mb-5">Help</p>
          <ul className="space-y-3 text-sm">
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Customer Care</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Shipping & Returns</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Size Guide</a></li>
            <li><a href="#" className="text-foreground/75 transition-colors hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom rule */}
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-350 flex-col items-start justify-between gap-3 px-4 py-6 text-[11px] uppercase tracking-[0.16em] text-foreground/50 sm:flex-row sm:items-center sm:px-6 lg:px-10">
          <p>© {year} Atelier Stylist · Almaty</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#" className="transition-colors hover:text-foreground">Privacy</a>
            <a href="#" className="transition-colors hover:text-foreground">Terms</a>
            <a href="#" className="transition-colors hover:text-foreground">Cookies</a>
            <span className="opacity-70">Powered by Vertex AI · OpenAI</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
