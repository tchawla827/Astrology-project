import { hasPremiumAccess, type SubscriptionRow } from "@/lib/subscription";

export const freeChartKeys = ["D1", "Bhava", "Moon"] as const;

export function canAccessChart(chartKey: string, subscription: SubscriptionRow | null | undefined) {
  return freeChartKeys.includes(chartKey as (typeof freeChartKeys)[number]) || hasPremiumAccess(subscription);
}
