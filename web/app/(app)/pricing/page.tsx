import { Check } from "lucide-react";

import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
import { createClient } from "@/lib/supabase/server";
import { normalizeTier } from "@/lib/subscription";

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
  if (user) {
    await track(supabase, "pricing_viewed", { tier }, user.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold">Astri Premium</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Keep the core chart free. Upgrade when you want unlimited questions, broader daily timing, and exports.
        </p>
      </div>

      {searchParams?.checkout === "success" ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          Checkout completed. Your subscription unlocks as soon as Stripe confirms the webhook.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
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
            {tier === "premium" ? (
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
            {tier === "premium" ? (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Manage billing from Profile.</p>
            ) : (
              <CheckoutButton interval="yearly" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
