import type { Metadata } from "next";
import Link from "next/link";
import { Database, Eye, MessageCircleQuestion, Orbit } from "lucide-react";

import { PublicShell } from "@/components/public/PublicShell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How it works",
  description: "How Astri turns birth details into a chart, life-area context, daily timing, and transparent answers.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  {
    icon: Database,
    title: "Enter birth details",
    copy: "Astri normalizes your place, time zone, ayanamsha, and birth-time confidence before generating the profile.",
  },
  {
    icon: Orbit,
    title: "Build the chart snapshot",
    copy: "The astrology engine computes placements, houses, nakshatras, dignity, yogas, dashas, transits, and panchang signals.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask specific questions",
    copy: "The LLM layer receives a bounded context package, route-specific prompts, and schema validation before it responds.",
  },
  {
    icon: Eye,
    title: "Inspect the reasoning",
    copy: "Transparency panels expose the chart factors behind an answer so you can see what the interpretation used.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-6 pt-32">
        <div className="cinematic-hero p-6 sm:p-8">
          <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">How it works</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">A chart-first workflow for astrology answers that can be inspected.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Astri separates calculation, context building, and answer generation so every user-facing insight starts from structured chart data.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-2">
        {steps.map((step, index) => (
          <article className="luxury-panel rounded-lg p-6" key={step.title}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
              <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</p>
          </article>
        ))}
      </section>
      <section className="border-y border-primary/15 bg-card/35">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Start with the free workspace.</h2>
            <p className="mt-1 text-sm text-muted-foreground">All current chart, Ask, Daily, and export features are included.</p>
          </div>
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
