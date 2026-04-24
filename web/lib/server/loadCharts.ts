import { ChartSnapshotSchema } from "@/lib/schemas";
import type { BirthProfile, ChartSnapshot } from "@/lib/schemas";

type ProfileRow = Pick<BirthProfile, "id" | "name" | "status" | "birth_time_confidence" | "engine_version" | "created_at">;

type ChartSnapshotRow = {
  id: string;
  engine_version: string;
  computed_at: string;
  payload: unknown;
};

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type SupabaseChartsClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

export type ChartExplorerViewModel =
  | { status: "empty" }
  | { status: "processing"; profile: ProfileRow; profileId: string; errorMessage?: string }
  | { status: "error"; profile: ProfileRow; profileId: string; errorMessage?: string }
  | {
      status: "ready";
      profile: ProfileRow;
      profileId: string;
      snapshot: ChartSnapshot;
      snapshotMeta: { id: string; engine_version: string; computed_at: string };
    };

function asProfile(data: unknown): ProfileRow | null {
  return data && typeof data === "object" ? (data as ProfileRow) : null;
}

function asChartRow(data: unknown): ChartSnapshotRow | null {
  return data && typeof data === "object" ? (data as ChartSnapshotRow) : null;
}

export async function loadChartExplorer(
  supabase: SupabaseChartsClient,
  userId: string,
  profileId?: string,
): Promise<ChartExplorerViewModel> {
  let profileQuery = supabase
    .from("birth_profiles")
    .select("id,name,status,birth_time_confidence,engine_version,created_at")
    .eq("user_id", userId);

  if (profileId) {
    profileQuery = profileQuery.eq("id", profileId);
  }

  const { data: profileData, error: profileError } = await profileQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return { status: "error", profile: { id: "", name: "", status: "error", birth_time_confidence: "unknown", engine_version: "", created_at: "" }, profileId: "", errorMessage: profileError.message };
  }

  const profile = asProfile(profileData);
  if (!profile) {
    return { status: "empty" };
  }

  if (profile.status === "processing" || profile.status === "error") {
    return {
      status: profile.status,
      profile,
      profileId: profile.id,
      errorMessage: profile.status === "error" ? "Profile generation failed. Regenerate the chart snapshot to retry." : undefined,
    };
  }

  const { data: chartData, error: chartError } = await supabase
    .from("chart_snapshots")
    .select("id,engine_version,computed_at,payload")
    .eq("birth_profile_id", profile.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (chartError) {
    return { status: "error", profile, profileId: profile.id, errorMessage: chartError.message };
  }

  const chartRow = asChartRow(chartData);
  if (!chartRow) {
    return { status: "error", profile, profileId: profile.id, errorMessage: "The profile is ready but no chart snapshot was found." };
  }

  const parsed = ChartSnapshotSchema.safeParse(chartRow.payload);
  if (!parsed.success) {
    return { status: "error", profile, profileId: profile.id, errorMessage: "The stored chart snapshot does not match the expected schema." };
  }

  return {
    status: "ready",
    profile,
    profileId: profile.id,
    snapshot: parsed.data,
    snapshotMeta: {
      id: chartRow.id,
      engine_version: chartRow.engine_version,
      computed_at: chartRow.computed_at,
    },
  };
}
