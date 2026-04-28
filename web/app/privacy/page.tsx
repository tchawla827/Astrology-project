import type { Metadata } from "next";

import { PublicShell } from "@/components/public/PublicShell";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Astri handles account, birth profile, astrology, and deletion data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-4xl px-6 pb-20 pt-32">
        <div className="cinematic-hero p-6 sm:p-8">
          <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Privacy</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-glow sm:text-6xl">Privacy Policy</h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Last updated: April 25, 2026</p>
        </div>
        <div className="luxury-panel mt-6 rounded-lg p-6 text-sm leading-7 text-muted-foreground sm:p-8">
          <div className="space-y-6">
          <p>
            Astri stores account details, birth data, generated chart snapshots, Ask sessions, analytics events, subscription status, exports, and share-card tokens so the product can generate and preserve your astrology workspace.
          </p>
          <p>
            Birth data can include name, birth date, birth time, birth-time confidence, place text, latitude, longitude, time zone, ayanamsha, and derived chart output. This data is used to calculate charts, timing, daily predictions, and answers.
          </p>
          <p>
            Payments are not required for current product features. If paid plans return later, card processing would be handled by a payment provider rather than stored by Astri.
          </p>
          <p>
            You can delete your account from the app. Deletion removes profile data tied to your account, including generated chart records, Ask history, exports, analytics events, and share tokens according to database cascade rules.
          </p>
          <p>
            Operational logs may include request metadata and error details. Production logs are structured for debugging and monitoring, and should not be used to intentionally record secrets.
          </p>
          </div>
        </div>
      </article>
    </PublicShell>
  );
}
