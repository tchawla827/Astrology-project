import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/events";
import { constructWebhookEvent, type StripeSubscription } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function activeTier(subscription: Pick<StripeSubscription, "status" | "current_period_end">) {
  if (subscription.status === "active" || subscription.status === "trialing") {
    return "premium";
  }
  if (subscription.current_period_end && subscription.current_period_end * 1000 > Date.now()) {
    return "premium";
  }
  return "free";
}

async function findUserIdForSubscription(input: {
  supabase: ReturnType<typeof createServiceClient>;
  subscription: StripeSubscription;
}) {
  const fromMetadata = input.subscription.metadata?.user_id;
  if (fromMetadata) {
    return fromMetadata;
  }

  const { data } = await input.supabase
    .from("user_profiles")
    .select("id")
    .eq("stripe_customer_id", input.subscription.customer)
    .maybeSingle();
  return (data as { id?: string } | null)?.id;
}

async function syncSubscription(input: {
  supabase: ReturnType<typeof createServiceClient>;
  subscription: StripeSubscription;
}) {
  const userId = await findUserIdForSubscription(input);
  if (!userId) {
    return;
  }

  const tier = activeTier(input.subscription);
  const { error } = await input.supabase
    .from("user_profiles")
    .update({
      subscription_tier: tier,
      stripe_customer_id: input.subscription.customer,
      stripe_subscription_id: input.subscription.id,
      subscription_current_period_end: input.subscription.current_period_end
        ? new Date(input.subscription.current_period_end * 1000).toISOString()
        : null,
    })
    .eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }

  if (tier === "premium") {
    await track(input.supabase, "subscription_started", { status: input.subscription.status }, userId);
  } else {
    await track(input.supabase, "subscription_cancelled", { status: input.subscription.status }, userId);
  }
}

export async function POST(request: Request) {
  const payload = await request.text();

  try {
    const event = constructWebhookEvent(payload, request.headers.get("stripe-signature"));
    const supabase = createServiceClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = (session.metadata as Record<string, string> | undefined)?.user_id;
      if (userId) {
        const { error } = await supabase
          .from("user_profiles")
          .update({
            subscription_tier: "premium",
            stripe_customer_id: session.customer ?? null,
            stripe_subscription_id: session.subscription ?? null,
          })
          .eq("id", userId);
        if (error) {
          throw new Error(error.message);
        }
        await track(supabase, "subscription_started", { source: "checkout" }, userId);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncSubscription({ supabase, subscription: event.data.object as StripeSubscription });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed." },
      { status: 400 },
    );
  }
}
