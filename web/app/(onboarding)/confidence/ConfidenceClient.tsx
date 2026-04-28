"use client";

import { useRouter } from "next/navigation";
import { Clock3, HelpCircle, ShieldCheck } from "lucide-react";

import { withReplaceMode } from "@/lib/accountRouting";

const options = [
  { id: "exact", label: "Exact time", body: "Use this if your birth time is from a certificate or reliable record." },
  { id: "approximate", label: "Approximate time", body: "Use this if the time is remembered but may be off by minutes." },
  { id: "unknown", label: "Unknown time", body: "Astri uses noon and marks time-sensitive features as lower confidence." },
] as const;

const optionIcons = {
  exact: ShieldCheck,
  approximate: Clock3,
  unknown: HelpCircle,
} as const;

export function ConfidenceClient({ replaceMode }: { replaceMode: boolean }) {
  const router = useRouter();

  function choose(confidence: string) {
    window.localStorage.setItem("astri:birth_time_confidence", confidence);
    router.push(withReplaceMode("/birth-details", replaceMode));
  }

  return (
    <main className="cinematic-scene relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <section className="luxury-panel relative w-full max-w-4xl overflow-hidden rounded-lg p-6 sm:p-8">
        <div className="celestial-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Step 2</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow">How reliable is your birth time?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Birth time controls house-sensitive interpretation. Astri will label confidence instead of pretending uncertain data is exact.
          </p>
        </div>
      <div className="relative mt-8 grid gap-3">
        {options.map((option) => (
          <button
            className="group w-full cursor-pointer rounded-lg border border-primary/15 bg-background/55 p-5 text-left transition-colors hover:border-primary/55 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={option.id}
            onClick={() => choose(option.id)}
            type="button"
          >
            <span className="flex gap-4">
              {(() => {
                const Icon = optionIcons[option.id];
                return (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                );
              })()}
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">{option.body}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      </section>
    </main>
  );
}
