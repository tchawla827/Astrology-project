import { getTimelineYear } from "@/lib/astro/client";
import { buildTransitOverlay } from "@/lib/server/generateDailyPrediction";
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
  timingBundleForTopic,
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

export type SupabaseTimelineClient = {
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

function selectedMonthDates(dates: string[], selectedMonth?: number) {
  if (!selectedMonth) {
    return [];
  }
  const monthText = String(selectedMonth).padStart(2, "0");
  return dates.filter((date) => date.slice(5, 7) === monthText);
}

function periodBoundaryMs(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(`${value}T00:00:00Z`);
  }
  return Date.parse(value);
}

function activePeriod(timeline: DashaTimeline, level: DashaTimeline["periods"][number]["level"], instantIso: string) {
  const at = Date.parse(instantIso);
  return timeline.periods.find((period) => {
    const start = periodBoundaryMs(period.start);
    const end = periodBoundaryMs(period.end);
    return period.level === level && start <= at && end > at;
  });
}

function dashaTimingForDate(timeline: DashaTimeline, instantIso: string): LifeAreaDashaTiming {
  return {
    system: timeline.system,
    active_mahadasha: activePeriod(timeline, "mahadasha", instantIso),
    active_antardasha: activePeriod(timeline, "antardasha", instantIso),
    active_pratyantardasha: activePeriod(timeline, "pratyantardasha", instantIso),
  };
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
    const timeline = await getTimelineYear({
      birth_date: profile.birth_date,
      birth_time: profile.birth_time,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
      ayanamsha: profile.ayanamsha,
      year: input.year,
      natal: {
        lagna_sign: parsedSnapshot.data.summary.lagna,
        planetary_positions: parsedSnapshot.data.planetary_positions,
      },
    });
    const timingBundle = timingBundleForTopic({
      snapshot: parsedSnapshot.data,
      derived: parsedDerived.data,
      topic: input.topic,
    });

    const dailyPoints = timeline.days.map((day) =>
      scoreLifeAreaTimingPoint({
        snapshot: parsedSnapshot.data,
        bundle: timingBundle,
        topic: input.topic,
        date: day.date,
        transits: overlayTransits(day.transits, parsedSnapshot.data),
        dashaTiming: dashaTimingForDate(timeline.dasha, day.scoring_instant),
        birthTimeConfidence: parsedSnapshot.data.birth_time_confidence ?? profile.birth_time_confidence,
      }),
    );

    const monthly = Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return aggregateMonthlyTimingPoint(dailyPoints.filter((point) => point.date.slice(5, 7) === month));
    });
    const dates = timeline.days.map((day) => day.date);
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
      cache: { transitsHit: 0, transitsMiss: timeline.days.length },
    };
  } catch (error) {
    return {
      status: "error",
      profile,
      errorMessage: errorMessage(error, "Could not calculate the timing graph."),
    };
  }
}
