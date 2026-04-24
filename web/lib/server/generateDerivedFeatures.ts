import { computeBundles, DERIVED_SCHEMA_VERSION } from "@/lib/derived/computeBundles";
import { ChartSnapshotSchema, DerivedFeaturePayloadSchema, type DerivedFeaturePayload } from "@/lib/schemas";

type QueryResult = PromiseLike<{ data: unknown; error: Error | { message: string } | null }>;

type SupabaseEqQuery = {
  maybeSingle(): QueryResult;
};

type SupabaseSelectQuery = {
  eq(column: string, value: string): SupabaseEqQuery;
};

export type SupabaseDerivedClient = {
  from(table: string): {
    select(columns: string): SupabaseSelectQuery;
    insert(payload: unknown): PromiseLike<{ error: Error | { message: string } | null }> | { error: Error | { message: string } | null };
  };
};

type ChartSnapshotRow = {
  id: string;
  birth_profile_id: string;
  payload: unknown;
};

type BirthProfileOwnerRow = {
  user_id: string;
};

type UserProfileIntentRow = {
  onboarding_intent: string | null;
};

function toError(error: Error | { message: string } | null, fallback: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error.message === "string") {
    return new Error(error.message);
  }

  return new Error(fallback);
}

function asChartSnapshotRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Partial<ChartSnapshotRow>;
  if (typeof row.id !== "string" || typeof row.birth_profile_id !== "string" || !("payload" in row)) {
    return null;
  }

  return row as ChartSnapshotRow;
}

function asBirthProfileOwnerRow(value: unknown): BirthProfileOwnerRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Partial<BirthProfileOwnerRow>;
  return typeof row.user_id === "string" ? { user_id: row.user_id } : null;
}

function asUserProfileIntentRow(value: unknown): UserProfileIntentRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Partial<UserProfileIntentRow>;
  return typeof row.onboarding_intent === "string" || row.onboarding_intent === null
    ? { onboarding_intent: row.onboarding_intent ?? null }
    : null;
}

type GenerateDerivedFeaturesArgs = {
  supabase: SupabaseDerivedClient;
  chartSnapshotId: string;
};

export async function generateDerivedFeatures({
  supabase,
  chartSnapshotId,
}: GenerateDerivedFeaturesArgs): Promise<DerivedFeaturePayload> {
  const { data: chartData, error: chartError } = await supabase
    .from("chart_snapshots")
    .select("id,birth_profile_id,payload")
    .eq("id", chartSnapshotId)
    .maybeSingle();

  if (chartError) {
    throw toError(chartError, "Could not load the source chart snapshot.");
  }

  const chartRow = asChartSnapshotRow(chartData);
  if (!chartRow) {
    throw new Error("Chart snapshot not found for derived feature generation.");
  }

  const parsedSnapshot = ChartSnapshotSchema.safeParse(chartRow.payload);
  if (!parsedSnapshot.success) {
    throw new Error("Stored chart snapshot does not match the expected schema.");
  }

  const { data: birthProfileData, error: birthProfileError } = await supabase
    .from("birth_profiles")
    .select("user_id")
    .eq("id", chartRow.birth_profile_id)
    .maybeSingle();

  if (birthProfileError) {
    throw toError(birthProfileError, "Could not load the birth profile for derived features.");
  }

  const birthProfileOwner = asBirthProfileOwnerRow(birthProfileData);
  const { data: userProfileData, error: userProfileError } = birthProfileOwner
    ? await supabase.from("user_profiles").select("onboarding_intent").eq("id", birthProfileOwner.user_id).maybeSingle()
    : { data: null, error: null };

  if (userProfileError) {
    throw toError(userProfileError, "Could not load onboarding intent for derived features.");
  }

  const payload = DerivedFeaturePayloadSchema.parse(
    computeBundles(parsedSnapshot.data, {
      onboardingIntent: asUserProfileIntentRow(userProfileData)?.onboarding_intent,
    }),
  );

  const { error: insertError } = await supabase.from("derived_feature_snapshots").insert({
    birth_profile_id: chartRow.birth_profile_id,
    chart_snapshot_id: chartRow.id,
    schema_version: DERIVED_SCHEMA_VERSION,
    payload,
  });

  if (insertError) {
    throw toError(insertError, "Could not store the derived feature snapshot.");
  }

  return payload;
}
