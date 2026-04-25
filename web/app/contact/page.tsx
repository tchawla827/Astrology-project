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
      <section className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Contact</p>
        <h1 className="mt-3 text-4xl font-semibold">Support</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          For account, billing, privacy, or product support, email the Astri team.
        </p>
        <Link className="mt-8 inline-flex items-center gap-2 rounded-md border px-4 py-3 text-sm hover:bg-muted" href="mailto:support@astri.app">
          <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
          support@astri.app
        </Link>
      </section>
    </PublicShell>
  );
}
