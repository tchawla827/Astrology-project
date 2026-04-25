import { createHmac, timingSafeEqual } from "crypto";

const stripeApiBase = "https://api.stripe.com/v1";

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type StripeCheckoutSession = {
  id: string;
  customer?: string;
  subscription?: string;
  metadata?: Record<string, string>;
};

export type StripeSubscription = {
  id: string;
  customer: string;
  status: StripeSubscriptionStatus;
  current_period_end?: number;
  metadata?: Record<string, string>;
};

export type StripeWebhookEvent =
  | { id: string; type: "checkout.session.completed"; data: { object: StripeCheckoutSession } }
  | { id: string; type: "customer.subscription.updated" | "customer.subscription.deleted"; data: { object: StripeSubscription } }
  | { id: string; type: string; data: { object: Record<string, unknown> } };

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return key;
}

function appendFormValue(form: URLSearchParams, key: string, value: string | number | boolean | null | undefined) {
  if (value !== undefined && value !== null) {
    form.append(key, String(value));
  }
}

async function stripePost<T>(path: string, form: URLSearchParams): Promise<T> {
  const response = await fetch(`${stripeApiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? ((body.error as { message?: string }).message ?? "Stripe request failed.")
        : "Stripe request failed.";
    throw new Error(message);
  }
  return body as T;
}

export function priceIdForInterval(interval: "monthly" | "yearly") {
  const key = interval === "monthly" ? "STRIPE_MONTHLY_PRICE_ID" : "STRIPE_YEARLY_PRICE_ID";
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`${key} is not configured.`);
  }
  return priceId;
}

export async function createCheckoutSession(input: {
  userId: string;
  email?: string | null;
  customerId?: string | null;
  interval: "monthly" | "yearly";
  origin: string;
}) {
  const form = new URLSearchParams();
  appendFormValue(form, "mode", "subscription");
  appendFormValue(form, "line_items[0][price]", priceIdForInterval(input.interval));
  appendFormValue(form, "line_items[0][quantity]", 1);
  appendFormValue(form, "success_url", `${input.origin}/pricing?checkout=success`);
  appendFormValue(form, "cancel_url", `${input.origin}/pricing?checkout=cancelled`);
  appendFormValue(form, "metadata[user_id]", input.userId);
  appendFormValue(form, "subscription_data[metadata][user_id]", input.userId);
  appendFormValue(form, "allow_promotion_codes", true);
  if (input.customerId) {
    appendFormValue(form, "customer", input.customerId);
  } else {
    appendFormValue(form, "customer_email", input.email);
  }

  return stripePost<{ id: string; url: string }>("/checkout/sessions", form);
}

export async function createBillingPortalSession(input: { customerId: string; origin: string }) {
  const form = new URLSearchParams();
  appendFormValue(form, "customer", input.customerId);
  appendFormValue(form, "return_url", `${input.origin}/profile`);
  return stripePost<{ id: string; url: string }>("/billing_portal/sessions", form);
}

function parseStripeSignature(signature: string) {
  return Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
}

export function constructWebhookEvent(payload: string, signature: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  if (!signature) {
    throw new Error("Stripe signature is missing.");
  }

  const parts = parseStripeSignature(signature);
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) {
    throw new Error("Stripe signature is malformed.");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const computed = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const computedBuffer = Buffer.from(computed, "hex");
  if (expectedBuffer.length !== computedBuffer.length || !timingSafeEqual(expectedBuffer, computedBuffer)) {
    throw new Error("Stripe signature verification failed.");
  }

  return JSON.parse(payload) as StripeWebhookEvent;
}
