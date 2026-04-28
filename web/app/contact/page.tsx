import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { PublicShell } from "@/components/public/PublicShell";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Astri support.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-32">
        <div className="cinematic-hero p-6 sm:p-8">
          <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Contact</p>
          <h1 className="mt-4 font-display text-5xl font-semibold text-glow sm:text-6xl">Support</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            For account, privacy, or product support, email the Astri team.
          </p>
          <Link className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/30 bg-background/45 px-4 py-3 text-sm transition-colors hover:border-primary/60 hover:bg-primary/10" href="mailto:support@astri.app">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            support@astri.app
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
