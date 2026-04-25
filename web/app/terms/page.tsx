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
      <article className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Terms</p>
        <h1 className="mt-3 text-4xl font-semibold">Terms of Service</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Last updated: April 25, 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            Astri provides astrology calculations, interpretations, and AI-assisted explanations for reflection and planning. It is not medical, legal, financial, or mental-health advice.
          </p>
          <p>
            You are responsible for the accuracy of the birth details you enter and for decisions you make after reading Astri output. Generated interpretations may be incomplete or incorrect.
          </p>
          <p>
            Premium subscriptions unlock additional product limits and may be managed through the billing portal when available. Prices, features, and limits may change with reasonable notice.
          </p>
          <p>
            Do not misuse the service, attempt to access another user&apos;s data, reverse engineer private APIs, or upload content that violates applicable law.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}
