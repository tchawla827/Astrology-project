import { ChartSnapshotSchema, DerivedFeaturePayloadSchema, type ChartSnapshot, type DerivedFeaturePayload, type ToneMode } from "@/lib/schemas";

export type LifeAreaLoadStatus = "empty" | "processing" | "ready" | "error";

export type LifeAreaProfile = {
  id: string;
  name: string;
  status: Exclude<LifeAreaLoadStatus, "empty">;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  created_at: string;
};

export type LifeAreaContext =
  | {
      status: "empty";
    }
  | {
      status: "processing" | "error";
      profile: LifeAreaProfile;
      profileId: string;
      errorMessage?: string;
    }
  | {
      status: "ready";
      profile: LifeAreaProfile;
      profileId: string;
      snapshot: ChartSnapshot;
      derived: DerivedFeaturePayload;
      defaultToneMode: ToneMode;
    };

type BirthProfileRow = LifeAreaProfile & {
  user_id: string;
};

type ChartSnapshotRow = {
  payload: unknown;
};

type DerivedSnapshotRow = {
  payload: unknown;
};

type UserProfileRow = {
  default_tone_mode: ToneMode | null;
};

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type SupabaseLifeAreaClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

const profileColumns = ["id", "user_id", "name", "status", "birth_time_confidence", "created_at"].join(",");

function asProfile(value: unknown): BirthProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as BirthProfileRow;
}

function asChartRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as ChartSnapshotRow;
}

function asDerivedRow(value: unknown): DerivedSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as DerivedSnapshotRow;
}

function asUserProfile(value: unknown): UserProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as UserProfileRow;
}

function profileView(profile: BirthProfileRow): LifeAreaProfile {
  return {
    id: profile.id,
    name: profile.name,
    status: profile.status,
    birth_time_confidence: profile.birth_time_confidence,
    created_at: profile.created_at,
  };
}

export async function loadLifeAreaContext(
  supabase: SupabaseLifeAreaClient,
  userId: string,
  profileId?: string,
): Promise<LifeAreaContext> {
  let profileQuery = supabase.from("birth_profiles").select(profileColumns).eq("user_id", userId);

  if (profileId) {
    profileQuery = profileQuery.eq("id", profileId);
  }

  const { data: profileData, error: profileError } = await profileQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return { status: "error", profile: profileView({ id: profileId ?? "", user_id: userId, name: "", status: "error", birth_time_confidence: "unknown", created_at: "" }), profileId: profileId ?? "", errorMessage: profileError.message };
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

  const [{ data: chartData, error: chartError }, { data: derivedData, error: derivedError }, { data: userProfileData }] =
    await Promise.all([
      supabase
        .from("chart_snapshots")
        .select("payload")
        .eq("birth_profile_id", profile.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("derived_feature_snapshots")
        .select("payload")
        .eq("birth_profile_id", profile.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_profiles").select("default_tone_mode").eq("id", userId).maybeSingle(),
    ]);

  if (chartError) {
    return { status: "error", profile: profileView(profile), profileId: profile.id, errorMessage: chartError.message };
  }

  if (derivedError) {
    return { status: "error", profile: profileView(profile), profileId: profile.id, errorMessage: derivedError.message };
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

  const derivedRow = asDerivedRow(derivedData);
  if (!derivedRow) {
    return {
      status: "error",
      profile: profileView(profile),
      profileId: profile.id,
      errorMessage: "The profile is ready but no derived snapshot was found.",
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

  const parsedDerived = DerivedFeaturePayloadSchema.safeParse(derivedRow.payload);
  if (!parsedDerived.success) {
    return {
      status: "error",
      profile: profileView(profile),
      profileId: profile.id,
      errorMessage: "The stored derived snapshot does not match the expected schema.",
    };
  }

  return {
    status: "ready",
    profile: profileView(profile),
    profileId: profile.id,
    snapshot: parsedSnapshot.data,
    derived: parsedDerived.data,
    defaultToneMode: asUserProfile(userProfileData)?.default_tone_mode ?? "direct",
  };
}
