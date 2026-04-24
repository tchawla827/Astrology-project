import type { ProfileRequest, ChartSnapshot } from "@/lib/astro/client";
import { generateProfile as generateAstroProfile } from "@/lib/astro/client";
import { generateDerivedFeatures, type SupabaseDerivedClient } from "@/lib/server/generateDerivedFeatures";

type SupabaseWriteClient = {
  from(table: string): {
    insert(payload: unknown):
      | PromiseLike<{ error: Error | null }>
      | {
          error: Error | null;
          select(columns: string): {
            single(): PromiseLike<{ data: unknown; error: Error | null }>;
          };
        };
    update(payload: unknown): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }> | { error: Error | null };
    };
  };
};

type GenerateProfileArgs = {
  supabase: SupabaseWriteClient;
  birthProfileId: string;
  birthTimeConfidence?: "exact" | "approximate" | "unknown";
  input: ProfileRequest;
  astroProfile?: (input: ProfileRequest) => Promise<ChartSnapshot>;
  generateDerivedFeaturesFn?: (args: { supabase: SupabaseWriteClient; chartSnapshotId: string }) => Promise<unknown>;
};

async function updateBirthProfile(supabase: SupabaseWriteClient, birthProfileId: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from("birth_profiles").update(payload).eq("id", birthProfileId);
  if (error) {
    throw error;
  }
}

export async function generateProfileForBirthProfile({
  supabase,
  birthProfileId,
  birthTimeConfidence,
  input,
  astroProfile = generateAstroProfile,
  generateDerivedFeaturesFn = ({ supabase: client, chartSnapshotId }) =>
    generateDerivedFeatures({
      supabase: client as unknown as SupabaseDerivedClient,
      chartSnapshotId,
    }),
}: GenerateProfileArgs) {
  try {
    const snapshot = await astroProfile(input);
    const payload = {
      ...snapshot,
      birth_profile_id: birthProfileId,
      birth_time_confidence: birthTimeConfidence,
    };

    const snapshotInsert = supabase.from("chart_snapshots").insert({
      birth_profile_id: birthProfileId,
      engine_version: snapshot.engine_version,
      payload,
    });

    if (!("select" in snapshotInsert)) {
      throw new Error("chart_snapshots insert must return the inserted row id for phase 05.");
    }

    const { data: snapshotRow, error: snapshotError } = await snapshotInsert.select("id").single();
    if (snapshotError) {
      throw snapshotError;
    }

    const chartSnapshotId =
      snapshotRow && typeof snapshotRow === "object" && "id" in snapshotRow && typeof snapshotRow.id === "string"
        ? snapshotRow.id
        : null;

    if (!chartSnapshotId) {
      throw new Error("Chart snapshot insert did not return an id.");
    }

    await generateDerivedFeaturesFn({ supabase, chartSnapshotId });

    await updateBirthProfile(supabase, birthProfileId, {
      engine_version: snapshot.engine_version,
      status: "ready",
    });

    return payload;
  } catch (error) {
    await updateBirthProfile(supabase, birthProfileId, { status: "error" });
    throw error;
  }
}
