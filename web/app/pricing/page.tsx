import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { PublicShell } from "@/components/public/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Free Plan",
  description: "Astri currently includes all available features on the free plan.",
  alternates: { canonical: "/pricing" },
};

const included = [
  "Unlimited Ask questions",
  "Daily predictions for any date",
  "Unlimited basic PDF exports",
  "Classical divisional charts and advanced chart extras",
];

export default function PricingPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Free plan</p>
        <h1 className="mt-3 text-4xl font-semibold">Everything is included for $0</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Astri is currently free while the product is being developed. No current feature requires payment.
        </p>

        <div className="mt-8 max-w-xl">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle>Free</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-3xl font-semibold">$0</p>
              <ul className="space-y-2 text-muted-foreground">
                {included.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link href="/signup">Start free</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}
