import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { PublicShell } from "@/components/public/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { normalizeTier } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Astri pricing for free chart access and Premium astrology features.",
  alternates: { canonical: "/pricing" },
};

const included = [
  "Unlimited Ask questions",
  "Daily predictions for any date",
  "Unlimited basic PDF exports",
  "Classical divisional charts and advanced chart extras",
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: { checkout?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("user_profiles")
        .select("subscription_tier,subscription_current_period_end")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const tier = normalizeTier(data as { subscription_tier?: "free" | "premium"; subscription_current_period_end?: string | null } | null);

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Pricing</p>
        <h1 className="mt-3 text-4xl font-semibold">Astri Premium</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Keep the core chart free. Upgrade when you want unlimited questions, broader daily timing, and exports.
        </p>

        {searchParams?.checkout === "success" ? (
          <div className="mt-6 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
            Checkout completed. Your subscription unlocks as soon as Stripe confirms the webhook.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-3xl font-semibold">$0</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>5 Ask questions per month</li>
                <li>Today + next 7 days in Daily</li>
                <li>1 lifetime basic PDF export</li>
                <li>Base D1, Bhava, and Moon chart views</li>
              </ul>
              <Button asChild className="w-full" variant="outline">
                <Link href="/signup">Start free</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle>Premium Monthly</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold">$12</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {included.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {!user ? (
                <Button asChild className="w-full">
                  <Link href="/signup">Create account to upgrade</Link>
                </Button>
              ) : tier === "premium" ? (
                <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Premium is active.</p>
              ) : (
                <CheckoutButton interval="monthly" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Premium Yearly</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold">$99</p>
              <p className="text-sm text-muted-foreground">Same Premium access with a lower annual rate.</p>
              {!user ? (
                <Button asChild className="w-full" variant="outline">
                  <Link href="/signup">Create account to upgrade</Link>
                </Button>
              ) : tier === "premium" ? (
                <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Manage billing from Profile.</p>
              ) : (
                <CheckoutButton interval="yearly" />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}
