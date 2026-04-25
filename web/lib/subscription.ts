export type SubscriptionTier = "free" | "premium";

export type SubscriptionRow = {
  subscription_tier?: SubscriptionTier | null;
  subscription_current_period_end?: string | null;
};

export function hasPremiumAccess(row: SubscriptionRow | null | undefined, now = new Date()) {
  if (!row) {
    return false;
  }
  if (row.subscription_tier === "premium") {
    return true;
  }
  if (!row.subscription_current_period_end) {
    return false;
  }
  return Date.parse(row.subscription_current_period_end) > now.getTime();
}

export function normalizeTier(row: SubscriptionRow | null | undefined, now = new Date()): SubscriptionTier {
  return hasPremiumAccess(row, now) ? "premium" : "free";
}
