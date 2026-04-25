import { PanchangSchema, type Panchang } from "@/lib/schemas";

const PANCHANG_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

export type SupabasePanchangCacheClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): MutationResult;
  };
};

type PanchangCacheRow = {
  payload: unknown;
  computed_at: string;
};

function asCacheRow(value: unknown): PanchangCacheRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<PanchangCacheRow>;
  return typeof row.computed_at === "string" ? (row as PanchangCacheRow) : null;
}

function toErrorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

export function roundedPanchangCoordinate(value: number) {
  return Number(value.toFixed(2));
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
    throw new Error(toErrorMessage(error, "Could not read panchang cache."));
  }

  const row = asCacheRow(data);
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
    throw new Error(toErrorMessage(error, "Could not write panchang cache."));
  }
}
