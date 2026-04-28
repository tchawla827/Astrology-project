"use client";

import { useRouter } from "next/navigation";
import { Brain, BriefcaseBusiness, HeartHandshake, HeartPulse, Sparkles, Telescope } from "lucide-react";

import { withReplaceMode } from "@/lib/accountRouting";
import { Button } from "@/components/ui/button";

const intents = [
  { id: "know-self", label: "Know myself", body: "Understand personality, strengths, and blind spots." },
  { id: "career", label: "Career", body: "Focus on work, direction, and timing." },
  { id: "marriage", label: "Marriage", body: "Look at relationship and partnership themes." },
  { id: "health", label: "Health", body: "Track constitution and wellness-sensitive factors." },
  { id: "spirituality", label: "Spirituality", body: "Explore dharma, inner life, and practices." },
  { id: "full-chart", label: "Full chart", body: "Keep the analysis broad." },
] as const;

const intentIcons = {
  "know-self": Brain,
  career: BriefcaseBusiness,
  marriage: HeartHandshake,
  health: HeartPulse,
  spirituality: Sparkles,
  "full-chart": Telescope,
} as const;

export function IntentClient({ replaceMode }: { replaceMode: boolean }) {
  const router = useRouter();

  function choose(intent: string) {
    window.localStorage.setItem("astri:onboarding_intent", intent);
    router.push(withReplaceMode("/confidence", replaceMode));
  }

  return (
    <main className="cinematic-scene relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <section className="luxury-panel relative w-full max-w-5xl overflow-hidden rounded-lg p-6 sm:p-8">
        <div className="celestial-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Step 1</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow">What should Astri prioritize?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Pick the room you want the chart to open toward first. You can still inspect the full system later.
          </p>
        </div>
      <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {intents.map((intent) => (
          <button
            className="group min-h-36 cursor-pointer rounded-lg border border-primary/15 bg-background/55 p-5 text-left transition-colors hover:border-primary/55 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={intent.id}
            onClick={() => choose(intent.id)}
            type="button"
          >
            {(() => {
              const Icon = intentIcons[intent.id];
              return (
                <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              );
            })()}
            <span className="mt-5 block font-medium">{intent.label}</span>
            <span className="mt-2 block text-sm text-muted-foreground">{intent.body}</span>
          </button>
        ))}
      </div>
        <Button className="relative mt-6 w-fit" onClick={() => choose("full-chart")} variant="ghost">
          Skip for now
        </Button>
      </section>
    </main>
  );
}
