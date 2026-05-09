import { getDasha, getTransits } from "@/lib/astro/client";
import { readTransitCache, writeTransitCache, type SupabaseDailyCacheClient } from "@/lib/daily/cache";
import { buildTransitOverlay, startOfDayInTimezoneIso } from "@/lib/server/generateDailyPrediction";
import {
  ChartSnapshotSchema,
  DerivedFeaturePayloadSchema,
  type ChartSnapshot,
  type DerivedFeaturePayload,
  type DashaTimeline,
  type LifeAreaTimingSeries,
  type ToneMode,
  type TransitSummary,
} from "@/lib/schemas";
import {
  aggregateMonthlyTimingPoint,
  buildLifeAreaTimingSeries,
  scoreLifeAreaTimingPoint,
  type LifeAreaDashaTiming,
  type LifeAreaTimingTopic,
} from "@/lib/timeline/scoring";

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

export type SupabaseTimelineClient = SupabaseDailyCacheClient & {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): MutationResult;
  };
};

export type TimelineProfile = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  birth_place_text: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: "lahiri" | "raman" | "kp";
  engine_version: string;
  status: "processing" | "ready" | "error";
  created_at: string;
};

export type TimelineContext =
  | { status: "empty" }
  | { status: "processing" | "error"; profile?: TimelineProfile; errorMessage?: string }
  | {
      status: "ready";
      profile: TimelineProfile;
      snapshot: ChartSnapshot;
      derived: DerivedFeaturePayload;
      defaultToneMode: ToneMode;
      series: LifeAreaTimingSeries;
      cache: {
        transitsHit: number;
        transitsMiss: number;
      };
    };

type ChartSnapshotRow = {
  id: string;
  payload: unknown;
};

type DerivedSnapshotRow = {
  id: string;
  payload: unknown;
};

type UserProfileRow = {
  default_tone_mode: ToneMode | null;
};

const profileColumns = [
  "id",
  "user_id",
  "name",
  "birth_date",
  "birth_time",
  "birth_time_confidence",
  "birth_place_text",
  "latitude",
  "longitude",
  "timezone",
  "ayanamsha",
  "engine_version",
  "status",
  "created_at",
].join(",");

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : fallback;
}

function asProfile(value: unknown): TimelineProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<TimelineProfile>;
  return typeof row.id === "string" && typeof row.status === "string" ? (row as TimelineProfile) : null;
}

function asChartRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ChartSnapshotRow>;
  return typeof row.id === "string" ? (row as ChartSnapshotRow) : null;
}

function asDerivedRow(value: unknown): DerivedSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<DerivedSnapshotRow>;
  return typeof row.id === "string" ? (row as DerivedSnapshotRow) : null;
}

function asUserProfile(value: unknown): UserProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as UserProfileRow;
}

function plusDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function dateListForYear(year: number) {
  const dates: string[] = [];
  let current = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  while (current < end) {
    dates.push(current);
    current = plusDays(current, 1);
  }
  return dates;
}

function selectedMonthDates(dates: string[], selectedMonth?: number) {
  if (!selectedMonth) {
    return [];
  }
  const monthText = String(selectedMonth).padStart(2, "0");
  return dates.filter((date) => date.slice(5, 7) === monthText);
}

function activePeriod(timeline: DashaTimeline, level: DashaTimeline["periods"][number]["level"], date: string) {
  return timeline.periods.find((period) => period.level === level && period.start <= date && period.end > date);
}

function dashaTimingForDate(timeline: DashaTimeline, date: string): LifeAreaDashaTiming {
  return {
    system: timeline.system,
    active_mahadasha: activePeriod(timeline, "mahadasha", date),
    active_antardasha: activePeriod(timeline, "antardasha", date),
    active_pratyantardasha: activePeriod(timeline, "pratyantardasha", date),
  };
}

async function mapLimit<TInput, TOutput>(
  values: TInput[],
  limit: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>,
) {
  const results: TOutput[] = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index] as TInput, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

async function loadTransitSummary(input: {
  supabase: SupabaseTimelineClient;
  profile: TimelineProfile;
  date: string;
}) {
  const cached = await readTransitCache({
    supabase: input.supabase,
    date: input.date,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
  });
  if (cached) {
    return { transits: cached.transits, cache: "hit" as const };
  }

  const transits = await getTransits({
    birth_date: input.profile.birth_date,
    birth_time: input.profile.birth_time,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
    at: startOfDayInTimezoneIso(input.date, input.profile.timezone),
  });

  await writeTransitCache({
    supabase: input.supabase,
    date: input.date,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
    transits,
  });

  return { transits, cache: "miss" as const };
}

function overlayTransits(transits: TransitSummary, snapshot: ChartSnapshot) {
  return buildTransitOverlay({
    transits,
    natalPositions: snapshot.planetary_positions,
    lagnaSign: snapshot.summary.lagna,
  }).transits;
}

export async function loadTimelineContext(input: {
  supabase: SupabaseTimelineClient;
  userId: string;
  topic: LifeAreaTimingTopic;
  year: number;
  selectedMonth?: number;
}): Promise<TimelineContext> {
  const { data: profileData, error: profileError } = await input.supabase
    .from("birth_profiles")
    .select(profileColumns)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return { status: "error", errorMessage: errorMessage(profileError, "Could not load birth profile.") };
  }

  const profile = asProfile(profileData);
  if (!profile) {
    return { status: "empty" };
  }

  if (profile.status === "processing" || profile.status === "error") {
    return {
      status: profile.status,
      profile,
      errorMessage: profile.status === "error" ? "Profile generation failed. Regenerate the chart snapshot to retry." : undefined,
    };
  }

  const [{ data: chartData, error: chartError }, { data: derivedData, error: derivedError }, { data: userProfileData }] =
    await Promise.all([
      input.supabase
        .from("chart_snapshots")
        .select("id,payload")
        .eq("birth_profile_id", profile.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      input.supabase
        .from("derived_feature_snapshots")
        .select("id,payload")
        .eq("birth_profile_id", profile.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      input.supabase.from("user_profiles").select("default_tone_mode").eq("id", input.userId).maybeSingle(),
    ]);

  if (chartError) {
    return { status: "error", profile, errorMessage: errorMessage(chartError, "Could not load chart snapshot.") };
  }
  if (derivedError) {
    return { status: "error", profile, errorMessage: errorMessage(derivedError, "Could not load derived snapshot.") };
  }

  const chartRow = asChartRow(chartData);
  const derivedRow = asDerivedRow(derivedData);
  if (!chartRow || !derivedRow) {
    return { status: "error", profile, errorMessage: "The profile is ready but chart-derived timing inputs are missing." };
  }

  const parsedSnapshot = ChartSnapshotSchema.safeParse(chartRow.payload);
  const parsedDerived = DerivedFeaturePayloadSchema.safeParse(derivedRow.payload);
  if (!parsedSnapshot.success || !parsedDerived.success) {
    return { status: "error", profile, errorMessage: "Stored chart timing inputs do not match the expected schema." };
  }

  try {
    const dates = dateListForYear(input.year);
    const dasha = await getDasha({
      birth_date: profile.birth_date,
      birth_time: profile.birth_time,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
      ayanamsha: profile.ayanamsha,
      depth: "pratyantardasha",
      from: `${input.year}-01-01`,
      to: `${input.year + 1}-01-01`,
    });
    let transitsHit = 0;
    let transitsMiss = 0;

    const dailyPoints = await mapLimit(dates, 8, async (date) => {
      const transitResult = await loadTransitSummary({ supabase: input.supabase, profile, date });
      if (transitResult.cache === "hit") {
        transitsHit += 1;
      } else {
        transitsMiss += 1;
      }

      return scoreLifeAreaTimingPoint({
        snapshot: parsedSnapshot.data,
        bundle: parsedDerived.data.topic_bundles[input.topic],
        topic: input.topic,
        date,
        transits: overlayTransits(transitResult.transits, parsedSnapshot.data),
        dashaTiming: dashaTimingForDate(dasha, date),
        birthTimeConfidence: parsedSnapshot.data.birth_time_confidence ?? profile.birth_time_confidence,
      });
    });

    const monthly = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return aggregateMonthlyTimingPoint(dailyPoints.filter((point) => point.date.slice(5, 7) === month));
    });
    const selectedDaily = selectedMonthDates(dates, input.selectedMonth);
    const selectedDailyPoints =
      selectedDaily.length > 0 ? dailyPoints.filter((point) => selectedDaily.includes(point.date)) : undefined;
    const series = buildLifeAreaTimingSeries({
      topic: input.topic,
      year: input.year,
      timezone: profile.timezone,
      monthly,
      daily: selectedDailyPoints,
    });

    return {
      status: "ready",
      profile,
      snapshot: parsedSnapshot.data,
      derived: parsedDerived.data,
      defaultToneMode: asUserProfile(userProfileData)?.default_tone_mode ?? "direct",
      series,
      cache: { transitsHit, transitsMiss },
    };
  } catch (error) {
    return {
      status: "error",
      profile,
      errorMessage: errorMessage(error, "Could not calculate the timing graph."),
    };
  }
}
