import { SUPPORTED_CHART_KEYS } from "@/lib/charts/catalog";
import type { SubscriptionRow } from "@/lib/subscription";

export const freeChartKeys = SUPPORTED_CHART_KEYS;

export function canAccessChart(chartKey: string, subscription: SubscriptionRow | null | undefined) {
  void chartKey;
  void subscription;
  return true;
}
