import { DailyPredictionSchema, TransitSummarySchema, type DailyPrediction, type TransitSummary } from "@/lib/schemas";
import type { DailyContextBundle } from "@/lib/server/generateDailyPrediction";
import {
  asComputedPayloadRow,
  cacheErrorMessage,
  roundedCacheCoordinate,
  type ComputedPayloadRow,
  type SupabaseCacheClient,
} from "@/lib/cache/shared";

const DAILY_SCHEMA_VERSION = "daily_v2_scoring_v5_structured_timing" as const;

type DailyCacheRow = ComputedPayloadRow & {
  render_payload?: unknown;
};

export type SupabaseDailyCacheClient = SupabaseCacheClient;

export type DailyRenderCachePayload = {
  prediction: DailyPrediction;
  transits: TransitSummary;
  context: DailyContextBundle;
};

export function roundedCoordinate(value: number) {
  return roundedCacheCoordinate(value);
}

export async function readDailyPredictionCache(input: {
  supabase: SupabaseDailyCacheClient;
  birth_profile_id: string;
  date: string;
  tone: DailyPrediction["tone"];
}) {
  const { data, error } = await input.supabase
    .from("daily_predictions_cache")
    .select("payload,render_payload,computed_at")
    .eq("birth_profile_id", input.birth_profile_id)
    .eq("date", input.date)
    .eq("tone", input.tone)
    .eq("answer_schema_version", DAILY_SCHEMA_VERSION)
    .maybeSingle();

  if (error) {
    throw new Error(cacheErrorMessage(error, "Could not read daily prediction cache."));
  }

  const row = asComputedPayloadRow<DailyCacheRow>(data);
  if (!row) {
    return null;
  }

  const parsed = DailyPredictionSchema.safeParse(row.payload);
  if (!parsed.success) {
    return null;
  }

  const renderPayload = parseRenderPayload(row.render_payload, parsed.data);
  return { prediction: parsed.data, renderPayload, computed_at: row.computed_at };
}

export async function writeDailyPredictionCache(input: {
  supabase: SupabaseDailyCacheClient;
  birth_profile_id: string;
  prediction: DailyPrediction;
  renderPayload?: DailyRenderCachePayload;
}) {
  const { error } = await input.supabase.from("daily_predictions_cache").upsert(
    {
      birth_profile_id: input.birth_profile_id,
      date: input.prediction.date,
      tone: input.prediction.tone,
      answer_schema_version: DAILY_SCHEMA_VERSION,
      payload: input.prediction,
      render_payload: input.renderPayload,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "birth_profile_id,date,tone,answer_schema_version" },
  );

  if (error) {
    throw new Error(cacheErrorMessage(error, "Could not write daily prediction cache."));
  }
}

function parseRenderPayload(value: unknown, expectedPrediction: DailyPrediction): DailyRenderCachePayload | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Partial<DailyRenderCachePayload>;
  const prediction = DailyPredictionSchema.safeParse(candidate.prediction);
  const transits = TransitSummarySchema.safeParse(candidate.transits);
  if (!prediction.success || !transits.success) {
    return undefined;
  }
  if (prediction.data.date !== expectedPrediction.date || prediction.data.tone !== expectedPrediction.tone) {
    return undefined;
  }
  if (JSON.stringify(prediction.data) !== JSON.stringify(expectedPrediction)) {
    return undefined;
  }
  if (!candidate.context || typeof candidate.context !== "object") {
    return undefined;
  }
  return {
    prediction: prediction.data,
    transits: transits.data,
    context: candidate.context as DailyContextBundle,
  };
}

export async function readTransitCache(input: {
  supabase: SupabaseDailyCacheClient;
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: string;
  expected_as_of?: string;
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
    throw new Error(cacheErrorMessage(error, "Could not read transit cache."));
  }

  const row = asComputedPayloadRow(data);
  if (!row) {
    return null;
  }

  const parsed = TransitSummarySchema.safeParse(row.payload);
  if (!parsed.success) {
    return null;
  }
  if (input.expected_as_of && Date.parse(parsed.data.as_of) !== Date.parse(input.expected_as_of)) {
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
    throw new Error(cacheErrorMessage(error, "Could not write transit cache."));
  }
}
