import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Gauge,
  Layers3,
  MessageSquareText,
  Orbit,
  ShieldCheck,
  Sparkles,
  Telescope,
  Timer,
} from "lucide-react";

import { PublicShell } from "@/components/public/PublicShell";
import { Button } from "@/components/ui/button";
import { resolveSignedInPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Astri",
  description:
    "Generate a Vedic birth chart, inspect divisional charts, ask grounded astrology questions, and review timing with transparent reasoning.",
  alternates: { canonical: "/" },
};

const howItWorks = [
  {
    icon: Compass,
    title: "Birth data becomes a structured chart snapshot",
    copy: "Astri computes the core Vedic views, divisional charts, dashas, transits, and panchang context before any interpretation is written.",
  },
  {
    icon: Layers3,
    title: "Every answer carries chart context",
    copy: "Life areas, timing windows, and AI answers are tied back to charts, houses, planets, and current periods.",
  },
  {
    icon: Eye,
    title: "Reasoning stays visible",
    copy: "Open the transparency layer to see which charts and timing factors influenced the answer.",
  },
];

const supportedCharts = [
  "D1 / Rashi",
  "Bhava",
  "Moon / Chandra Lagna",
  "D9 / Navamsa",
  "D10 / Dashamsa",
  "D7 / Saptamsa",
  "D12 / Dwadashamsa",
  "D30 / Trimsamsa",
  "D60 / Shashtiamsa",
];

const trustSignals = [
  "Chart-first interpretation",
  "Transparent AI reasoning",
  "Tone controls for directness",
  "Profile deletion controls",
];

const reportRows = [
  { label: "Identity", value: "Lagna, Moon sign, Nakshatra, chart strengths" },
  { label: "Timing", value: "Mahadasha, Antardasha, transit pressure, favorable windows" },
  { label: "Life areas", value: "Career, money, marriage, children, spirituality, health" },
  { label: "Advisory", value: "Ask AI answers with confidence and reasoning trails" },
];

function DashboardPreview() {
  return (
    <div className="luxury-panel relative overflow-hidden rounded-lg p-4 sm:p-5">
      <div className="star-noise pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="celestial-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Personal observatory</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">Chart intelligence</h2>
          </div>
          <div className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary">
            Live timing
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-primary/20 bg-background/55 p-4">
            <div className="mx-auto flex aspect-square max-w-[22rem] items-center justify-center rounded-lg border border-primary/20 bg-background/70 p-5 shadow-inner">
              <div className="relative aspect-square w-full max-w-[17rem]">
                <div className="absolute inset-0 rotate-45 border border-primary/55" />
                <div className="absolute inset-[18%] rotate-45 border border-primary/35" />
                <div className="absolute inset-[34%] rounded-full border border-accent/55" />
                {["Su", "Mo", "Ma", "Ju", "Sa", "Ve"].map((planet, index) => (
                  <span
                    className="absolute flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-card text-xs text-primary shadow-bronze"
                    key={planet}
                    style={{
                      left: `${12 + ((index * 31) % 68)}%`,
                      top: `${10 + ((index * 23) % 70)}%`,
                    }}
                  >
                    {planet}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              { label: "Lagna", value: "Scorpio", icon: Telescope },
              { label: "Moon", value: "Cancer", icon: Sparkles },
              { label: "Nakshatra", value: "Anuradha pada 2", icon: Orbit },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-lg border border-primary/15 bg-background/50 p-4" key={item.label}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 font-medium">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Mahadasha", value: "Jupiter", meta: "18 months left" },
            { label: "Antardasha", value: "Saturn", meta: "Discipline cycle" },
            { label: "Current phase", value: "Caution window", meta: "Review commitments" },
          ].map((item) => (
            <div className="rounded-lg border border-primary/15 bg-background/55 p-4" key={item.label}>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(
        await resolveSignedInPath(
          supabase as unknown as SupabaseAccountRoutingClient,
          user.id,
        ),
      );
    }
  }

  return (
    <PublicShell>
      <section className="cosmic-surface relative min-h-screen overflow-hidden px-6 pb-20 pt-32 lg:pb-28 lg:pt-36">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="star-noise absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">Vedic astrology intelligence</p>
            <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.96] text-foreground sm:text-7xl lg:text-8xl">
              Astri
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-muted-foreground">
              A private cosmic observatory for chart calculation, divisional analysis, transparent AI counsel, and time-aware prediction.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Generate My Chart
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#system">Explore the System</Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {trustSignals.slice(0, 3).map((signal) => (
                <div className="flex items-center gap-2" key={signal}>
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="bg-background px-6 py-20" id="system">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-primary">How it works</p>
            <h2 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">The system is built from charts first.</h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {howItWorks.map((item) => {
              const Icon = item.icon;
              return (
                <article className="luxury-panel rounded-lg p-6" key={item.title}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-primary/15 bg-card/30 px-6 py-20">
        <div className="celestial-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-primary">Supported charts</p>
            <h2 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">A full Vedic chart room, not a horoscope feed.</h2>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Move from foundational chart identity to specialized life-area lenses without losing the thread of timing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportedCharts.map((chart) => (
              <div className="rounded-lg border border-primary/15 bg-background/60 p-4 transition-colors hover:border-primary/45" key={chart}>
                <p className="text-sm font-medium">{chart}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="luxury-panel rounded-lg p-6 sm:p-8">
            <div className="flex items-center gap-3 text-primary">
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm uppercase tracking-[0.22em]">Ask AI</p>
            </div>
            <h2 className="mt-5 font-display text-4xl font-semibold sm:text-5xl">A private advisory room for specific questions.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Ask about career, money, marriage, children, spirituality, health, repeated patterns, or the exact timing pressure you are feeling.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Balanced", "Direct", "Brutal"].map((tone) => (
                <div className="rounded-lg border border-primary/15 bg-background/55 p-4" key={tone}>
                  <p className="font-semibold">{tone}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {tone === "Brutal" ? "Blunt and chart-grounded without theatrical cruelty." : "A controlled answer style for the same chart data."}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-accent/35 bg-accent/10 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-accent">
              <Gauge className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm uppercase tracking-[0.22em]">Brutal honesty mode</p>
            </div>
            <h3 className="mt-5 text-3xl font-semibold">Clarity without performance.</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The direct modes are designed for adults who want constraints, risks, and timing friction stated plainly while staying tied to the chart.
            </p>
            <div className="mt-8 space-y-3">
              {["No generic affirmations", "No hidden reasoning", "No mystical overclaiming"].map((item) => (
                <div className="flex items-center gap-3 text-sm" key={item}>
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="bg-card/35 px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-primary">Prediction timeline</p>
            <h2 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Timing should feel visible.</h2>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Mahadasha, Antardasha, transits, favorable periods, and caution windows are composed as a timeline instead of hidden in paragraphs.
            </p>
          </div>
          <div className="luxury-panel rounded-lg p-6">
            <div className="space-y-5">
              {[
                { icon: Timer, label: "Mahadasha", title: "Jupiter period", copy: "Long arc: expansion, mentors, belief systems" },
                { icon: CalendarDays, label: "Antardasha", title: "Saturn sub-period", copy: "Near arc: discipline, limits, delayed proof" },
                { icon: Orbit, label: "Transit window", title: "Caution phase", copy: "Short arc: commitments need review before acceleration" },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div className="grid gap-4 sm:grid-cols-[3rem_1fr]" key={item.label}>
                    <div className="relative flex justify-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {index < 2 ? <span className="absolute top-12 h-10 w-px bg-primary/25" aria-hidden="true" /> : null}
                    </div>
                    <div className="rounded-lg border border-primary/15 bg-background/50 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-primary">{item.label}</p>
                      <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
          <article className="luxury-panel rounded-lg p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-primary">Trust</p>
            <h2 className="mt-4 font-display text-4xl font-semibold">Built for repeated serious use.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {trustSignals.map((signal) => (
                <div className="rounded-lg border border-primary/15 bg-background/50 p-4" key={signal}>
                  <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">{signal}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-primary/20 bg-background/65 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm uppercase tracking-[0.22em]">Premium report preview</p>
            </div>
            <h2 className="mt-5 font-display text-4xl font-semibold">A report that reads like a guided dossier.</h2>
            <div className="mt-7 divide-y divide-border/70">
              {reportRows.map((row) => (
                <div className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr]" key={row.label}>
                  <p className="text-sm font-semibold text-primary">{row.label}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{row.value}</p>
                </div>
              ))}
            </div>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/signup">
                Generate My Chart
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </article>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="cosmic-surface relative mx-auto max-w-7xl overflow-hidden rounded-lg border border-primary/20 p-8 shadow-bronze sm:p-12">
          <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <Brain className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-5 font-display text-4xl font-semibold sm:text-5xl">Enter with a birth chart. Leave with a working map.</h2>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Astri is designed for people who want atmosphere, rigor, and practical specificity in the same product.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">Generate My Chart</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/how-it-works">Explore the System</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
