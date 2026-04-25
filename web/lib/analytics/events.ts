export const analyticsEvents = [
  "signup",
  "profile_generated",
  "dashboard_viewed",
  "chart_viewed",
  "life_area_viewed",
  "ask_submitted",
  "ask_quota_hit",
  "daily_viewed",
  "panchang_viewed",
  "share_card_created",
  "pricing_viewed",
  "checkout_started",
  "subscription_started",
  "subscription_cancelled",
  "export_downloaded",
  "account_deleted",
] as const;

export type AnalyticsEventName = (typeof analyticsEvents)[number];
export type AnalyticsProperties = Record<string, string | number | boolean | null>;

type DbError = { message: string };

export type SupabaseAnalyticsClient = {
  from(table: string): {
    insert(payload: unknown): PromiseLike<{ error: DbError | null }>;
  };
};

export async function track(
  supabase: SupabaseAnalyticsClient,
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
  userId?: string | null,
) {
  const { error } = await supabase.from("analytics_events").insert({
    user_id: userId ?? null,
    event_name: eventName,
    properties,
  });

  if (error) {
    console.error(`analytics:${eventName}`, error.message);
  }
}
