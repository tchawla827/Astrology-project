import { ChartSnapshotSchema } from "@/lib/schemas";
import type { ChartSnapshot } from "@/lib/astro/client";
import { buildDashboardSummary, type DashboardFocusCard } from "@/lib/insights/themes";

export type DashboardProfileStatus = "empty" | "processing" | "ready" | "error";

export type DashboardProfile = {
  id: string;
  name: string;
  status: Exclude<DashboardProfileStatus, "empty">;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  created_at: string;
};

export type DashboardViewModel = {
  status: DashboardProfileStatus;
  profile?: DashboardProfile;
  profileId?: string;
  errorMessage?: string;
  summary?: ChartSnapshot["summary"];
  dasha?: ChartSnapshot["dasha"];
  transits?: {
    as_of: string;
    highlights: string[];
  };
  topThemes?: string[];
  focusCards?: DashboardFocusCard[];
  askQuestions?: string[];
  snapshotMeta?: {
    id: string;
    engine_version: string;
    computed_at: string;
  };
  onboardingIntent?: string | null;
};

type BirthProfileRow = DashboardProfile & {
  birth_date: string;
  birth_time: string;
  birth_place_text: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: "lahiri" | "raman" | "kp";
  engine_version: string;
};

type ChartSnapshotRow = {
  id: string;
  engine_version: string;
  computed_at: string;
  payload: unknown;
};

type DerivedSnapshotRow = {
  payload: unknown;
};

type UserProfileRow = {
  onboarding_intent: string | null;
};

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type SupabaseDashboardClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

const profileColumns = [
  "id",
  "name",
  "status",
  "birth_date",
  "birth_time",
  "birth_time_confidence",
  "birth_place_text",
  "latitude",
  "longitude",
  "timezone",
  "ayanamsha",
  "engine_version",
  "created_at",
].join(",");

const intentQuestions: Record<string, string[]> = {
  career: ["Why has my career felt stuck?", "What kind of work fits my chart?", "When does career pressure ease?"],
  marriage: ["What is my relationship pattern?", "Why do commitments feel delayed?", "What should I watch before choosing a partner?"],
  health: ["Where does my chart show stress patterns?", "What routines support my current period?", "When should I avoid overexertion?"],
  spirituality: ["What is my spiritual learning curve?", "Why do I feel detached lately?", "Which practices fit this period?"],
  "know-self": ["What is my core personality edge?", "Why do I repeat the same patterns?", "What should I stop forcing?"],
  "full-chart": ["What is the strongest thing in my chart?", "What is changing in my life right now?", "What should I focus on this month?"],
};

function asProfile(data: unknown): BirthProfileRow | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as BirthProfileRow;
}

function asChartRow(data: unknown): ChartSnapshotRow | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as ChartSnapshotRow;
}

function asDerivedRow(data: unknown): DerivedSnapshotRow | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as DerivedSnapshotRow;
}

function asUserProfile(data: unknown): UserProfileRow | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as UserProfileRow;
}

function profileView(profile: BirthProfileRow): DashboardProfile {
  return {
    id: profile.id,
    name: profile.name,
    status: profile.status,
    birth_time_confidence: profile.birth_time_confidence,
    created_at: profile.created_at,
  };
}

function stableIndex(seed: string, length: number) {
  if (length <= 0) {
    return 0;
  }
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return total % length;
}

function buildAskQuestions(snapshot: ChartSnapshot, onboardingIntent?: string | null) {
  const candidates = new Set<string>(intentQuestions[onboardingIntent ?? ""] ?? intentQuestions["full-chart"]);
  const tenthHouseSignals = [
    ...snapshot.transits.highlights.filter((highlight) => /\b10(?:th)?\s+house\b/i.test(highlight)),
    ...snapshot.yogas.flatMap((yoga) => yoga.notes).filter((note) => /\bcareer|profession|10(?:th)?\s+house\b/i.test(note)),
  ];

  if (tenthHouseSignals.length > 0) {
    candidates.add("Why has my career felt stuck?");
  }
  candidates.add(`What does my ${snapshot.dasha.current_mahadasha.lord} Mahadasha want from me?`);
  candidates.add(`How should I handle ${snapshot.dasha.current_antardasha.lord} Antardasha right now?`);

  const ordered = [...candidates];
  const start = stableIndex(`${snapshot.summary.lagna}:${snapshot.summary.moon_sign}:${snapshot.transits.as_of}`, ordered.length);
  return [...ordered.slice(start), ...ordered.slice(0, start)].slice(0, 3);
}

export function buildDashboardViewModel(
  profile: BirthProfileRow,
  snapshot: ChartSnapshot,
  row: ChartSnapshotRow,
  onboardingIntent?: string | null,
  derivedPayload?: unknown,
): DashboardViewModel {
  const dashboardSummary = buildDashboardSummary(snapshot, derivedPayload);

  return {
    status: "ready",
    profile: profileView(profile),
    profileId: profile.id,
    summary: snapshot.summary,
    dasha: snapshot.dasha,
    transits: {
      as_of: snapshot.transits.as_of,
      highlights: snapshot.transits.highlights.slice(0, 2),
    },
    topThemes: dashboardSummary.top_themes.slice(0, 3),
    focusCards: dashboardSummary.focus_cards.slice(0, 1),
    askQuestions: buildAskQuestions(snapshot, onboardingIntent),
    snapshotMeta: {
      id: row.id,
      engine_version: row.engine_version,
      computed_at: row.computed_at,
    },
    onboardingIntent,
  };
}

export async function loadDashboard(
  supabase: SupabaseDashboardClient,
  userId: string,
  profileId?: string,
): Promise<DashboardViewModel> {
  let profileQuery = supabase
    .from("birth_profiles")
    .select(profileColumns)
    .eq("user_id", userId);

  if (profileId) {
    profileQuery = profileQuery.eq("id", profileId);
  }

  const { data: profileData, error: profileError } = await profileQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return { status: "error", errorMessage: profileError.message };
  }

  const profile = asProfile(profileData);
  if (!profile) {
    return { status: "empty" };
  }

  if (profile.status === "processing" || profile.status === "error") {
    return {
      status: profile.status,
      profile: profileView(profile),
      profileId: profile.id,
      errorMessage: profile.status === "error" ? "Profile generation failed. Regenerate the chart snapshot to retry." : undefined,
    };
  }

  const [{ data: chartData, error: chartError }, { data: intentData }] = await Promise.all([
    supabase
      .from("chart_snapshots")
      .select("id,engine_version,computed_at,payload")
      .eq("birth_profile_id", profile.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("user_profiles").select("onboarding_intent").eq("id", userId).maybeSingle(),
  ]);

  if (chartError) {
    return { status: "error", profile: profileView(profile), profileId: profile.id, errorMessage: chartError.message };
  }

  const chartRow = asChartRow(chartData);
  if (!chartRow) {
    return {
      status: "error",
      profile: profileView(profile),
      profileId: profile.id,
      errorMessage: "The profile is ready but no chart snapshot was found.",
    };
  }

  const parsedSnapshot = ChartSnapshotSchema.safeParse(chartRow.payload);
  if (!parsedSnapshot.success) {
    return {
      status: "error",
      profile: profileView(profile),
      profileId: profile.id,
      errorMessage: "The stored chart snapshot does not match the expected schema.",
    };
  }

  const { data: derivedData } = await supabase
    .from("derived_feature_snapshots")
    .select("payload")
    .eq("birth_profile_id", profile.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return buildDashboardViewModel(
    profile,
    parsedSnapshot.data,
    chartRow,
    asUserProfile(intentData)?.onboarding_intent,
    asDerivedRow(derivedData)?.payload,
  );
}
