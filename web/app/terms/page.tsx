import type { Metadata } from "next";

import { PublicShell } from "@/components/public/PublicShell";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Astri.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-4xl px-6 pb-20 pt-32">
        <div className="cinematic-hero p-6 sm:p-8">
          <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Terms</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-glow sm:text-6xl">Terms of Service</h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Last updated: April 25, 2026</p>
        </div>
        <div className="luxury-panel mt-6 rounded-lg p-6 text-sm leading-7 text-muted-foreground sm:p-8">
          <div className="space-y-6">
          <p>
            Astri provides astrology calculations, interpretations, and AI-assisted explanations for reflection and planning. It is not medical, legal, financial, or mental-health advice.
          </p>
          <p>
            You are responsible for the accuracy of the birth details you enter and for decisions you make after reading Astri output. Generated interpretations may be incomplete or incorrect.
          </p>
          <p>
            Astri currently provides all available product features on the free plan. Future paid plans, prices, features, and limits may change with reasonable notice.
          </p>
          <p>
            Do not misuse the service, attempt to access another user&apos;s data, reverse engineer private APIs, or upload content that violates applicable law.
          </p>
          </div>
        </div>
      </article>
    </PublicShell>
  );
}
