import { NextResponse } from "next/server";

import { createBillingPortalSession } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const customerId = (data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer is linked to this account." }, { status: 409 });
  }

  try {
    const session = await createBillingPortalSession({ customerId, origin: new URL(request.url).origin });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open billing portal." },
      { status: 500 },
    );
  }
}
