import type { Metadata } from "next";

import { PublicShell } from "@/components/public/PublicShell";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Astri handles account, birth profile, astrology, billing, and deletion data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Privacy</p>
        <h1 className="mt-3 text-4xl font-semibold">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Last updated: April 25, 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            Astri stores account details, birth data, generated chart snapshots, Ask sessions, analytics events, subscription status, exports, and share-card tokens so the product can generate and preserve your astrology workspace.
          </p>
          <p>
            Birth data can include name, birth date, birth time, birth-time confidence, place text, latitude, longitude, time zone, ayanamsha, and derived chart output. This data is used to calculate charts, timing, daily predictions, and answers.
          </p>
          <p>
            Billing is processed by Stripe. Astri stores subscription identifiers and status, but does not store full card numbers.
          </p>
          <p>
            You can delete your account from the app. Deletion removes profile data tied to your account, including generated chart records, Ask history, exports, analytics events, and share tokens according to database cascade rules.
          </p>
          <p>
            Operational logs may include request metadata and error details. Production logs are structured for debugging and monitoring, and should not be used to intentionally record secrets.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}
