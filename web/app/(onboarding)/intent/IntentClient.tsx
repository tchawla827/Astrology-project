"use client";

import { useRouter } from "next/navigation";

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

export function IntentClient({ replaceMode }: { replaceMode: boolean }) {
  const router = useRouter();

  function choose(intent: string) {
    window.localStorage.setItem("astri:onboarding_intent", intent);
    router.push(withReplaceMode("/confidence", replaceMode));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10">
      <p className="text-sm uppercase tracking-widest text-primary">Step 1</p>
      <h1 className="mt-3 text-3xl font-semibold">What should Astri prioritize?</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {intents.map((intent) => (
          <button
            className="rounded-lg border bg-card p-5 text-left transition-colors hover:border-primary"
            key={intent.id}
            onClick={() => choose(intent.id)}
            type="button"
          >
            <span className="font-medium">{intent.label}</span>
            <span className="mt-2 block text-sm text-muted-foreground">{intent.body}</span>
          </button>
        ))}
      </div>
      <Button className="mt-6 w-fit" onClick={() => choose("full-chart")} variant="ghost">
        Skip for now
      </Button>
    </main>
  );
}
