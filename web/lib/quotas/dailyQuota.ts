import { hasPremiumAccess, type SubscriptionRow } from "@/lib/subscription";

export const FREE_DAILY_FUTURE_DAYS = 7;

type DbError = { message: string };

type Query = PromiseLike<{ data: unknown; error: DbError | null }> & {
  eq(column: string, value: string): Query;
  maybeSingle(): PromiseLike<{ data: unknown; error: DbError | null }>;
};

export type SupabaseDailyQuotaClient = {
  from(table: string): {
    select(columns: string): Query;
  };
};

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : new Date(time);
}

function todayInUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysFromToday(date: string, now: Date) {
  const parsed = parseIsoDate(date);
  if (!parsed) {
    return null;
  }
  return Math.floor((parsed.getTime() - todayInUtc(now).getTime()) / 86_400_000);
}

async function loadSubscription(supabase: SupabaseDailyQuotaClient, userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("subscription_tier,subscription_current_period_end")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as SubscriptionRow | null;
}

export async function checkDailyQuota(input: {
  supabase: SupabaseDailyQuotaClient;
  userId: string;
  date: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const subscription = await loadSubscription(input.supabase, input.userId);
  if (hasPremiumAccess(subscription, now)) {
    return { allowed: true as const, tier: "premium" as const, date_offset_days: daysFromToday(input.date, now) };
  }

  if (input.date === "today") {
    return { allowed: true as const, tier: "free" as const, date_offset_days: 0 };
  }

  const offset = daysFromToday(input.date, now);
  if (offset === null || offset <= FREE_DAILY_FUTURE_DAYS) {
    return { allowed: true as const, tier: "free" as const, date_offset_days: offset };
  }

  return {
    allowed: false as const,
    tier: "free" as const,
    reason: "daily_date_outside_free_window" as const,
    upgrade_url: "/pricing" as const,
    date_offset_days: offset,
    max_future_days: FREE_DAILY_FUTURE_DAYS,
  };
}
