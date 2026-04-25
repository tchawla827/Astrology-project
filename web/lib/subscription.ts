export type SubscriptionTier = "free" | "premium";

export type SubscriptionRow = {
  subscription_tier?: SubscriptionTier | null;
  subscription_current_period_end?: string | null;
};

export function hasPremiumAccess(row: SubscriptionRow | null | undefined, now = new Date()) {
  void row;
  void now;
  return false;
}

export function normalizeTier(row: SubscriptionRow | null | undefined, now = new Date()): SubscriptionTier {
  void row;
  void now;
  return "free";
}
