import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Scissors,
  Play,
  Check,
  BarChart3,
  Smartphone,
} from "lucide-react";
import { Button } from "@acf/ui";
import { PLANS } from "@acf/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-[#E8E6E1]/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757] text-sm font-semibold text-white">
              AC
            </div>
            <span className="text-lg font-semibold">AI Clip Finder</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-[#6B6B6B] md:flex">
            <a href="#features" className="hover:text-[#1A1A1A]">Features</a>
            <a href="#how-it-works" className="hover:text-[#1A1A1A]">How it works</a>
            <a href="#pricing" className="hover:text-[#1A1A1A]">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
              Sign in
            </Link>
            <Link href="/signup">
              <Button variant="accent" size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F5] to-white" />
          <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D97757]/20 bg-[#D97757]/5 px-3 py-1 text-sm font-medium text-[#D97757]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-powered for creators
                </p>
                <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-[#1A1A1A] md:text-5xl lg:text-6xl">
                  Turn long videos into viral 9:16 reels
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-[#6B6B6B]">
                  Upload podcasts, interviews, or webinars. Get scored clips, hooks, captions,
                  and ready-to-post shorts — automatically.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link href="/signup">
                    <Button variant="accent" size="lg">
                      Start free — 50 credits <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg">Sign in</Button>
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap gap-6 text-sm text-[#6B6B6B]">
                  {["No credit card", "Whisper transcription", "Portrait clips"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" /> {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-sm">
                <div className="aspect-[9/16] overflow-hidden rounded-3xl border border-[#E8E6E1] bg-gradient-to-br from-[#1A1A1A] to-[#3D3D3D] shadow-2xl">
                  <div className="flex h-full flex-col justify-between p-6 text-white">
                    <div className="rounded-lg bg-white/10 px-3 py-1 text-xs">9:16 Reel</div>
                    <div>
                      <p className="text-lg font-semibold">Best moment detected</p>
                      <p className="mt-2 text-sm text-white/70">Virality score: 92</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Play className="h-8 w-8 fill-white" />
                      <span className="text-sm">Auto-generated clip</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 rounded-xl border border-[#E8E6E1] bg-white p-3 shadow-lg">
                  <BarChart3 className="h-5 w-5 text-[#D97757]" />
                  <p className="mt-1 text-xs font-medium">AI scored</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-[#E8E6E1] bg-[#FAF9F5] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center font-serif text-3xl font-semibold">Everything you need to go viral</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[#6B6B6B]">
              From upload to download-ready reels in one pipeline.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Sparkles, title: "AI Analysis", desc: "Virality, emotion, hook, and engagement scores for every moment." },
                { icon: Smartphone, title: "9:16 Reels", desc: "Portrait shorts optimized for TikTok, Reels, and Shorts." },
                { icon: Scissors, title: "Auto Clips", desc: "FFmpeg extracts the best segments automatically." },
                { icon: Zap, title: "Instant Captions", desc: "SRT, VTT, and burned captions from Whisper." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-[#E8E6E1] bg-white p-6">
                  <Icon className="mb-3 h-5 w-5 text-[#D97757]" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-[#6B6B6B]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center font-serif text-3xl font-semibold">How it works</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                { step: "1", title: "Upload", desc: "Drop your long-form video. We store it securely and start processing." },
                { step: "2", title: "AI analyzes", desc: "Whisper transcribes, GPT scores hooks, and picks viral moments." },
                { step: "3", title: "Download reels", desc: "Get 9:16 clips with titles, captions, and hooks ready to post." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D97757] text-lg font-semibold text-white">
                    {step}
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-[#6B6B6B]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-[#E8E6E1] bg-[#FAF9F5] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center font-serif text-3xl font-semibold">Simple pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[#6B6B6B]">
              Start free, upgrade when you need more credits.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-xl border bg-white p-6 ${plan.id === "pro" ? "border-[#D97757] shadow-md" : "border-[#E8E6E1]"}`}
                >
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-semibold">
                    {plan.priceLabel}
                    {plan.price > 0 && <span className="text-sm font-normal text-[#6B6B6B]">/mo</span>}
                  </p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{plan.monthlyCredits} credits</p>
                  <ul className="mt-4 space-y-2 text-sm text-[#6B6B6B]">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="mt-6 block">
                    <Button variant={plan.id === "pro" ? "accent" : "outline"} className="w-full">
                      Get started
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-serif text-3xl font-semibold">Ready to find your next viral clip?</h2>
            <p className="mt-4 text-[#6B6B6B]">Join creators turning hours of content into minutes of gold.</p>
            <Link href="/signup" className="mt-8 inline-block">
              <Button variant="accent" size="lg">
                Start free today <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E6E1] py-8 text-center text-sm text-[#6B6B6B]">
        © {new Date().getFullYear()} AI Clip Finder
      </footer>
    </div>
  );
}
