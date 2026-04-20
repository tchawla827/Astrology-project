import type { ProfileRequest, ChartSnapshot } from "@/lib/astro/client";
import { generateProfile as generateAstroProfile } from "@/lib/astro/client";

type SupabaseWriteClient = {
  from(table: string): {
    insert(payload: unknown): PromiseLike<{ error: Error | null }> | { error: Error | null };
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
}: GenerateProfileArgs) {
  try {
    const snapshot = await astroProfile(input);
    const payload = {
      ...snapshot,
      birth_profile_id: birthProfileId,
      birth_time_confidence: birthTimeConfidence,
    };

    const { error: snapshotError } = await supabase.from("chart_snapshots").insert({
      birth_profile_id: birthProfileId,
      engine_version: snapshot.engine_version,
      payload,
    });
    if (snapshotError) {
      throw snapshotError;
    }

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

