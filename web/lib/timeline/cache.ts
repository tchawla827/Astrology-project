import { TimelineYearSchema, type TimelineYear } from "@/lib/schemas";

type DbError = { message: string } | Error;
type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;
type MutationResult = PromiseLike<{ error: DbError | null }>;

type SupabaseQuery = {
  eq(column: string, value: string | number): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseTimelineCacheClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): MutationResult;
  };
};

type TimelineCacheKey = {
  birth_profile_id: string;
  year: number;
  chart_snapshot_id: string;
  engine_version: string;
  ayanamsha: string;
  timezone: string;
  latitude: number;
  longitude: number;
};

type TimelineCacheRow = {
  payload: unknown;
  computed_at: string;
};

function asTimelineCacheRow(value: unknown): TimelineCacheRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<TimelineCacheRow>;
  return typeof row.computed_at === "string" ? (row as TimelineCacheRow) : null;
}

function toErrorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

export function roundedTimelineCoordinate(value: number) {
  return Number(value.toFixed(2));
}

export async function readTimelineYearCache(input: { supabase: SupabaseTimelineCacheClient } & TimelineCacheKey) {
  const { data, error } = await input.supabase
    .from("timeline_year_cache")
    .select("payload,computed_at")
    .eq("birth_profile_id", input.birth_profile_id)
    .eq("year", input.year)
    .eq("chart_snapshot_id", input.chart_snapshot_id)
    .eq("engine_version", input.engine_version)
    .eq("ayanamsha", input.ayanamsha)
    .eq("timezone", input.timezone)
    .eq("lat_rounded", roundedTimelineCoordinate(input.latitude))
    .eq("lon_rounded", roundedTimelineCoordinate(input.longitude))
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage(error, "Could not read timeline cache."));
  }

  const row = asTimelineCacheRow(data);
  if (!row) {
    return null;
  }

  const parsed = TimelineYearSchema.safeParse(row.payload);
  if (!parsed.success) {
    return null;
  }

  return { timeline: parsed.data, computed_at: row.computed_at };
}

export async function writeTimelineYearCache(input: { supabase: SupabaseTimelineCacheClient } & TimelineCacheKey & { timeline: TimelineYear }) {
  const { error } = await input.supabase.from("timeline_year_cache").upsert(
    {
      birth_profile_id: input.birth_profile_id,
      year: input.year,
      chart_snapshot_id: input.chart_snapshot_id,
      engine_version: input.engine_version,
      ayanamsha: input.ayanamsha,
      timezone: input.timezone,
      lat_rounded: roundedTimelineCoordinate(input.latitude),
      lon_rounded: roundedTimelineCoordinate(input.longitude),
      payload: input.timeline,
      computed_at: new Date().toISOString(),
    },
    {
      onConflict:
        "birth_profile_id,year,chart_snapshot_id,engine_version,ayanamsha,timezone,lat_rounded,lon_rounded",
    },
  );

  if (error) {
    throw new Error(toErrorMessage(error, "Could not write timeline cache."));
  }
}
