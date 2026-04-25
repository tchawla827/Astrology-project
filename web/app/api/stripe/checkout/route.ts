import { NextResponse } from "next/server";
import { z } from "zod";

import { track } from "@/lib/analytics/events";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

const CheckoutRequestSchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CheckoutRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("email,stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      userId: user.id,
      email: (profile as { email?: string } | null)?.email ?? user.email,
      customerId: (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id,
      interval: parsed.data.interval,
      origin,
    });
    await track(supabase, "checkout_started", { interval: parsed.data.interval }, user.id);
    return NextResponse.json({ id: session.id, url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start checkout." },
      { status: 500 },
    );
  }
}
