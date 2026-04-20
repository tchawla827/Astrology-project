"use client";

import { useRouter } from "next/navigation";

const options = [
  { id: "exact", label: "Exact time", body: "Use this if your birth time is from a certificate or reliable record." },
  { id: "approximate", label: "Approximate time", body: "Use this if the time is remembered but may be off by minutes." },
  { id: "unknown", label: "Unknown time", body: "Astri uses noon and marks time-sensitive features as lower confidence." },
] as const;

export default function ConfidencePage() {
  const router = useRouter();

  function choose(confidence: string) {
    window.localStorage.setItem("astri:birth_time_confidence", confidence);
    router.push("/birth-details");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-10">
      <p className="text-sm uppercase tracking-widest text-primary">Step 2</p>
      <h1 className="mt-3 text-3xl font-semibold">How reliable is your birth time?</h1>
      <div className="mt-8 space-y-3">
        {options.map((option) => (
          <button
            className="w-full rounded-lg border bg-card p-5 text-left transition-colors hover:border-primary"
            key={option.id}
            onClick={() => choose(option.id)}
            type="button"
          >
            <span className="font-medium">{option.label}</span>
            <span className="mt-2 block text-sm text-muted-foreground">{option.body}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

