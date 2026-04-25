import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";

import { PublicShell } from "@/components/public/PublicShell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Astri",
  description: "Generate a Vedic birth chart, ask grounded astrology questions, and inspect the reasoning behind every answer.",
  alternates: { canonical: "/" },
};

const features = [
  {
    icon: BarChart3,
    title: "Classical chart foundation",
    copy: "D1, bhava, moon, divisional charts, dashas, transits, panchang, and life-area bundles in one workspace.",
  },
  {
    icon: MessageSquareText,
    title: "Ask with context",
    copy: "Questions are answered from your chart snapshot, current timing, and selected depth instead of generic horoscope text.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent and private",
    copy: "Each answer can expose its contributing factors, while account deletion removes stored profile data.",
  },
];

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/90 to-background" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[78vh] max-w-6xl content-center gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Vedic astrology workspace</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight text-foreground sm:text-6xl">Astri</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Generate your chart, understand the timing, ask specific questions, and see the exact astrological factors behind the answer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Get your free chart
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-card/80 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-center gap-2 border-b pb-3 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Live chart context
            </div>
            <dl className="mt-5 grid gap-4 text-sm">
              <div className="grid grid-cols-[8rem_1fr] gap-3">
                <dt className="text-muted-foreground">Focus</dt>
                <dd>Career, timing, relationships, health, family, relocation</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-3">
                <dt className="text-muted-foreground">Timing</dt>
                <dd>Dashas, transits, daily predictions, panchang windows</dd>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-3">
                <dt className="text-muted-foreground">Controls</dt>
                <dd>Answer tone, depth, transparency panel, share cards, exports</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-14 md:grid-cols-3">
        {features.map((feature) => (
          <article className="rounded-lg border bg-card p-5" key={feature.title}>
            <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
          </article>
        ))}
      </section>
    </PublicShell>
  );
}
