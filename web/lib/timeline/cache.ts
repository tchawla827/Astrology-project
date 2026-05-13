import { TimelineYearSchema, type TimelineYear } from "@/lib/schemas";
import {
  asComputedPayloadRow,
  cacheErrorMessage,
  roundedCacheCoordinate,
  type SupabaseCacheClient,
} from "@/lib/cache/shared";

export type SupabaseTimelineCacheClient = SupabaseCacheClient;

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

export function roundedTimelineCoordinate(value: number) {
  return roundedCacheCoordinate(value);
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
    throw new Error(cacheErrorMessage(error, "Could not read timeline cache."));
  }

  const row = asComputedPayloadRow(data);
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
    throw new Error(cacheErrorMessage(error, "Could not write timeline cache."));
  }
}
