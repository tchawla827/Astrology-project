import { hasPremiumAccess, type SubscriptionRow } from "@/lib/subscription";

export const FREE_ASKS_PER_MONTH = 5;

type DbError = { message: string };

type CountQuery = PromiseLike<{
  data: unknown;
  count: number | null;
  error: DbError | null;
}> & {
  eq(column: string, value: string): CountQuery;
  gte(column: string, value: string): CountQuery;
  lt(column: string, value: string): CountQuery;
};

export type SupabaseAskQuotaClient = {
  from(table: string): {
    select(columns: string, options?: { count?: "exact"; head?: boolean }): CountQuery;
  };
};

export type AskQuotaResult =
  | { allowed: true; tier: "free" | "premium"; used: number; limit: number | null; remaining: number | null }
  | {
      allowed: false;
      tier: "free";
      used: number;
      limit: number;
      remaining: 0;
      reason: "quota_exceeded";
      upgrade_url: "/pricing";
    };

function monthBounds(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function loadSubscription(supabase: SupabaseAskQuotaClient, userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("subscription_tier,subscription_current_period_end")
    .eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return Array.isArray(data) ? (data[0] as SubscriptionRow | undefined) : (data as SubscriptionRow | null);
}

async function countMonthlyAsks(supabase: SupabaseAskQuotaClient, userId: string, now: Date) {
  const { start, end } = monthBounds(now);
  const { count, error } = await supabase
    .from("ask_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function checkAskQuota(input: {
  supabase: SupabaseAskQuotaClient;
  userId: string;
  now?: Date;
}): Promise<AskQuotaResult> {
  const now = input.now ?? new Date();
  const subscription = await loadSubscription(input.supabase, input.userId);
  if (hasPremiumAccess(subscription, now)) {
    return { allowed: true, tier: "premium", used: 0, limit: null, remaining: null };
  }

  const used = await countMonthlyAsks(input.supabase, input.userId, now);
  const remaining = Math.max(FREE_ASKS_PER_MONTH - used, 0);
  if (used >= FREE_ASKS_PER_MONTH) {
    return {
      allowed: false,
      tier: "free",
      used,
      limit: FREE_ASKS_PER_MONTH,
      remaining: 0,
      reason: "quota_exceeded",
      upgrade_url: "/pricing",
    };
  }

  return { allowed: true, tier: "free", used, limit: FREE_ASKS_PER_MONTH, remaining };
}

export async function recordAskUsage(input: {
  supabase: {
    from(table: string): {
      insert(payload: unknown): PromiseLike<{ error: DbError | null }>;
    };
  };
  userId: string;
  askMessageId?: string;
}) {
  const { error } = await input.supabase.from("ask_usage").insert({
    user_id: input.userId,
    ask_message_id: input.askMessageId ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
}
