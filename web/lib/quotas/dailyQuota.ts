export const FREE_DAILY_FUTURE_DAYS: number | null = null;

export type SupabaseDailyQuotaClient = object;

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

export async function checkDailyQuota(input: {
  supabase: SupabaseDailyQuotaClient;
  userId: string;
  date: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const offset = input.date === "today" ? 0 : daysFromToday(input.date, now);
  return { allowed: true as const, tier: "free" as const, date_offset_days: offset };
}
