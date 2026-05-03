import { DailyPredictionSchema, TransitSummarySchema, type DailyPrediction, type TransitSummary } from "@/lib/schemas";

const DAILY_SCHEMA_VERSION = "daily_v3_jyotish_scoring_100" as const;

type DbError = { message: string } | Error;
type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;
type MutationResult = PromiseLike<{ error: DbError | null }>;

type SupabaseQuery = {
  eq(column: string, value: string | number): SupabaseQuery;
  gt(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseDailyCacheClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): MutationResult;
  };
};

type DailyCacheRow = {
  payload: unknown;
  computed_at: string;
};

type TransitCacheRow = {
  payload: unknown;
  computed_at: string;
};

function asDailyCacheRow(value: unknown): DailyCacheRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<DailyCacheRow>;
  return typeof row.computed_at === "string" ? (row as DailyCacheRow) : null;
}

function asTransitCacheRow(value: unknown): TransitCacheRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<TransitCacheRow>;
  return typeof row.computed_at === "string" ? (row as TransitCacheRow) : null;
}

function toErrorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

export function roundedCoordinate(value: number) {
  return Number(value.toFixed(2));
}

export async function readDailyPredictionCache(input: {
  supabase: SupabaseDailyCacheClient;
  birth_profile_id: string;
  date: string;
  tone: DailyPrediction["tone"];
}) {
  const { data, error } = await input.supabase
    .from("daily_predictions_cache")
    .select("payload,computed_at")
    .eq("birth_profile_id", input.birth_profile_id)
    .eq("date", input.date)
    .eq("tone", input.tone)
    .eq("answer_schema_version", DAILY_SCHEMA_VERSION)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage(error, "Could not read daily prediction cache."));
  }

  const row = asDailyCacheRow(data);
  if (!row) {
    return null;
  }

  const parsed = DailyPredictionSchema.safeParse(row.payload);
  if (!parsed.success) {
    return null;
  }

  return { prediction: parsed.data, computed_at: row.computed_at };
}

export async function writeDailyPredictionCache(input: {
  supabase: SupabaseDailyCacheClient;
  birth_profile_id: string;
  prediction: DailyPrediction;
}) {
  const { error } = await input.supabase.from("daily_predictions_cache").upsert(
    {
      birth_profile_id: input.birth_profile_id,
      date: input.prediction.date,
      tone: input.prediction.tone,
      answer_schema_version: DAILY_SCHEMA_VERSION,
      payload: input.prediction,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "birth_profile_id,date,tone,answer_schema_version" },
  );

  if (error) {
    throw new Error(toErrorMessage(error, "Could not write daily prediction cache."));
  }
}

export async function readTransitCache(input: {
  supabase: SupabaseDailyCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
}) {
  const { data, error } = await input.supabase
    .from("daily_transit_cache")
    .select("payload,computed_at")
    .eq("date", input.date)
    .eq("lat_rounded", roundedCoordinate(input.latitude))
    .eq("lon_rounded", roundedCoordinate(input.longitude))
    .eq("timezone", input.timezone)
    .eq("ayanamsha", input.ayanamsha)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage(error, "Could not read transit cache."));
  }

  const row = asTransitCacheRow(data);
  if (!row) {
    return null;
  }

  const parsed = TransitSummarySchema.safeParse(row.payload);
  if (!parsed.success) {
    return null;
  }

  return { transits: parsed.data, computed_at: row.computed_at };
}

export async function writeTransitCache(input: {
  supabase: SupabaseDailyCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
  transits: TransitSummary;
}) {
  const computedAt = new Date();
  const expiresAt = new Date(computedAt.getTime() + 24 * 60 * 60 * 1000);
  const { error } = await input.supabase.from("daily_transit_cache").upsert(
    {
      date: input.date,
      lat_rounded: roundedCoordinate(input.latitude),
      lon_rounded: roundedCoordinate(input.longitude),
      timezone: input.timezone,
      ayanamsha: input.ayanamsha,
      payload: input.transits,
      computed_at: computedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "date,lat_rounded,lon_rounded,timezone,ayanamsha" },
  );

  if (error) {
    throw new Error(toErrorMessage(error, "Could not write transit cache."));
  }
}
