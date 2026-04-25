type DbError = { message: string };

type CountQuery = PromiseLike<{
  data: unknown;
  count: number | null;
  error: DbError | null;
}> & {
  eq(column: string, value: string): CountQuery;
  gte(column: string, value: string): CountQuery;
};

export type SupabaseRateLimitClient = {
  from(table: string): {
    select(columns: string, options?: { count?: "exact"; head?: boolean }): CountQuery;
    insert(payload: unknown): PromiseLike<{ error: DbError | null }>;
  };
};

export type ApiRateLimitResult =
  | {
      allowed: true;
      key: string;
      limit: number;
      used: number;
      remaining: number;
      resetAt: string;
    }
  | {
      allowed: false;
      key: string;
      limit: number;
      used: number;
      remaining: 0;
      resetAt: string;
      retryAfterSeconds: number;
    };

export const apiRateLimitRules = {
  ask: { limit: 10, windowSeconds: 60 },
  daily: { limit: 30, windowSeconds: 60 },
  profile_create: { limit: 5, windowSeconds: 60 * 60 },
  share_card_create: { limit: 20, windowSeconds: 60 * 60 },
} as const;

export type ApiRateLimitKey = keyof typeof apiRateLimitRules;

function windowStart(now: Date, windowSeconds: number) {
  return new Date(now.getTime() - windowSeconds * 1000).toISOString();
}

function windowReset(now: Date, windowSeconds: number) {
  return new Date(now.getTime() + windowSeconds * 1000).toISOString();
}

export async function checkApiRateLimit(input: {
  supabase: SupabaseRateLimitClient;
  userId: string;
  key: ApiRateLimitKey;
  now?: Date;
}): Promise<ApiRateLimitResult> {
  const now = input.now ?? new Date();
  const rule = apiRateLimitRules[input.key];
  const since = windowStart(now, rule.windowSeconds);
  const resetAt = windowReset(now, rule.windowSeconds);

  const { count, error } = await input.supabase
    .from("api_rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("key", input.key)
    .gte("created_at", since);

  if (error) {
    throw new Error(error.message);
  }

  const used = count ?? 0;
  if (used >= rule.limit) {
    return {
      allowed: false,
      key: input.key,
      limit: rule.limit,
      used,
      remaining: 0,
      resetAt,
      retryAfterSeconds: rule.windowSeconds,
    };
  }

  const { error: insertError } = await input.supabase.from("api_rate_limit_events").insert({
    user_id: input.userId,
    key: input.key,
  });
  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    allowed: true,
    key: input.key,
    limit: rule.limit,
    used: used + 1,
    remaining: Math.max(rule.limit - used - 1, 0),
    resetAt,
  };
}
