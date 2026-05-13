import { PanchangSchema, type Panchang } from "@/lib/schemas";
import {
  asComputedPayloadRow,
  cacheErrorMessage,
  roundedCacheCoordinate,
  type SupabaseCacheClient,
} from "@/lib/cache/shared";

const PANCHANG_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SupabasePanchangCacheClient = SupabaseCacheClient;

export function roundedPanchangCoordinate(value: number) {
  return roundedCacheCoordinate(value);
}

async function readPanchangCacheRow(input: {
  supabase: SupabasePanchangCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
  freshOnly: boolean;
}) {
  let query = input.supabase
    .from("panchang_cache")
    .select("payload,computed_at")
    .eq("date", input.date)
    .eq("lat_rounded", roundedPanchangCoordinate(input.latitude))
    .eq("lon_rounded", roundedPanchangCoordinate(input.longitude))
    .eq("timezone", input.timezone)
    .eq("ayanamsha", input.ayanamsha);

  if (input.freshOnly) {
    query = query.gt("expires_at", new Date().toISOString());
  }

  const { data, error } = await query.order("computed_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    throw new Error(cacheErrorMessage(error, "Could not read panchang cache."));
  }

  const row = asComputedPayloadRow(data);
  if (!row) {
    return null;
  }

  const parsed = PanchangSchema.safeParse(row.payload);
  if (!parsed.success) {
    return null;
  }

  return { panchang: parsed.data, computed_at: row.computed_at };
}

export async function readPanchangCache(input: {
  supabase: SupabasePanchangCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
}) {
  return readPanchangCacheRow({ ...input, freshOnly: true });
}

export async function readStalePanchangCache(input: {
  supabase: SupabasePanchangCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
}) {
  return readPanchangCacheRow({ ...input, freshOnly: false });
}

export async function writePanchangCache(input: {
  supabase: SupabasePanchangCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
  panchang: Panchang;
}) {
  const computedAt = new Date();
  const expiresAt = new Date(computedAt.getTime() + PANCHANG_CACHE_TTL_MS);
  const { error } = await input.supabase.from("panchang_cache").upsert(
    {
      date: input.date,
      lat_rounded: roundedPanchangCoordinate(input.latitude),
      lon_rounded: roundedPanchangCoordinate(input.longitude),
      timezone: input.timezone,
      ayanamsha: input.ayanamsha,
      payload: input.panchang,
      computed_at: computedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "date,lat_rounded,lon_rounded,timezone,ayanamsha" },
  );

  if (error) {
    throw new Error(cacheErrorMessage(error, "Could not write panchang cache."));
  }
}
