import { AstroEngineError, getPanchang } from "@/lib/astro/client";
import { LlmContextError } from "@/lib/llm/errors";
import {
  readPanchangCache,
  readStalePanchangCache,
  writePanchangCache,
  type SupabasePanchangCacheClient,
} from "@/lib/panchang/cache";
import type { Panchang } from "@/lib/schemas";

type DbError = { message: string } | Error;
type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabasePanchangClient = SupabasePanchangCacheClient & {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): PromiseLike<{ error: DbError | null }>;
  };
};

type BirthProfileRow = {
  id: string;
  user_id: string;
  name: string;
  birth_place_text: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: "lahiri" | "raman" | "kp";
  status: "processing" | "ready" | "error";
};

export type PanchangLocation = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: "birth" | "override";
};

export type LoadPanchangInput = {
  supabase: SupabasePanchangClient;
  userId: string;
  date: string;
  profileId?: string;
  override?: {
    latitude: number;
    longitude: number;
    timezone: string;
    label?: string;
  };
};

export type LoadPanchangResult = {
  panchang: Panchang;
  profile: Pick<BirthProfileRow, "id" | "name" | "birth_place_text" | "timezone">;
  location: PanchangLocation;
  cache: "hit" | "miss" | "stale";
  stale: boolean;
  computed_at?: string;
};

function errorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

function asProfile(value: unknown): BirthProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<BirthProfileRow>;
  return typeof row.id === "string" ? (row as BirthProfileRow) : null;
}

function assertIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new LlmContextError("Panchang date must be an ISO date in YYYY-MM-DD format.");
  }
}

export function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function resolvePanchangDate(date: string, timezone: string) {
  if (date === "today") {
    return todayInTimezone(timezone);
  }
  assertIsoDate(date);
  return date;
}

async function loadProfile(input: { supabase: SupabasePanchangClient; userId: string; profileId?: string }) {
  let query = input.supabase
    .from("birth_profiles")
    .select("id,user_id,name,birth_place_text,latitude,longitude,timezone,ayanamsha,status")
    .eq("user_id", input.userId);

  if (input.profileId) {
    query = query.eq("id", input.profileId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    throw new LlmContextError(errorMessage(error, "Could not load birth profile."));
  }

  const profile = asProfile(data);
  if (!profile) {
    throw new LlmContextError("No birth profile found for panchang.");
  }
  if (profile.status !== "ready") {
    throw new LlmContextError(profile.status === "processing" ? "Profile generation is still running." : "Profile generation failed.");
  }
  return profile;
}

function resolveLocation(profile: BirthProfileRow, override?: LoadPanchangInput["override"]): PanchangLocation {
  if (override) {
    return {
      label: override.label ?? `${override.latitude.toFixed(2)}, ${override.longitude.toFixed(2)}`,
      latitude: override.latitude,
      longitude: override.longitude,
      timezone: override.timezone,
      source: "override",
    };
  }

  return {
    label: profile.birth_place_text,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    source: "birth",
  };
}

function validateLocation(location: PanchangLocation) {
  if (location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
    throw new LlmContextError("Panchang location coordinates are out of range.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: location.timezone }).format(new Date());
  } catch {
    throw new LlmContextError("Panchang timezone must be a valid IANA timezone.");
  }
}

export async function loadPanchang(input: LoadPanchangInput): Promise<LoadPanchangResult> {
  const profile = await loadProfile(input);
  const date = resolvePanchangDate(input.date, profile.timezone);
  const location = resolveLocation(profile, input.override);
  validateLocation(location);

  const cacheKey = {
    supabase: input.supabase,
    date,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    ayanamsha: profile.ayanamsha,
  };

  const cached = await readPanchangCache(cacheKey);
  if (cached) {
    return { panchang: cached.panchang, profile, location, cache: "hit", stale: false, computed_at: cached.computed_at };
  }

  try {
    const panchang = await getPanchang({
      date,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      ayanamsha: profile.ayanamsha,
    });
    await writePanchangCache({ ...cacheKey, panchang });
    return { panchang, profile, location, cache: "miss", stale: false };
  } catch (error) {
    const stale = await readStalePanchangCache(cacheKey);
    if (stale) {
      return { panchang: stale.panchang, profile, location, cache: "stale", stale: true, computed_at: stale.computed_at };
    }
    if (error instanceof AstroEngineError) {
      throw new LlmContextError(error.message);
    }
    throw error;
  }
}
