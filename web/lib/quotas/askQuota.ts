export const FREE_ASKS_PER_MONTH: number | null = null;

type DbError = { message: string };

export type SupabaseAskQuotaClient = object;

export type AskQuotaResult = {
  allowed: true;
  tier: "free";
  used: number;
  limit: number | null;
  remaining: number | null;
};

export async function checkAskQuota(input: {
  supabase: SupabaseAskQuotaClient;
  userId: string;
  now?: Date;
}): Promise<AskQuotaResult> {
  void input;
  return { allowed: true, tier: "free", used: 0, limit: null, remaining: null };
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
