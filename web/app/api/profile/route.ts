import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/events";
import { generateProfileForBirthProfile } from "@/lib/server/generateProfile";
import { normalizeProfileSubmission } from "@/lib/server/profileIntake";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const normalized = normalizeProfileSubmission(await request.json());
  if (!normalized.success) {
    return NextResponse.json({ errors: normalized.errors }, { status: 400 });
  }

  if (normalized.data.onboarding_intent) {
    const { error: intentError } = await supabase
      .from("user_profiles")
      .update({ onboarding_intent: normalized.data.onboarding_intent })
      .eq("id", user.id);
    if (intentError) {
      return NextResponse.json({ error: intentError.message }, { status: 500 });
    }
  }

  const { data: birthProfile, error: insertError } = await supabase
    .from("birth_profiles")
    .insert({
      user_id: user.id,
      name: normalized.data.name,
      birth_date: normalized.data.birth_date,
      birth_time: normalized.data.birth_time,
      birth_time_confidence: normalized.data.birth_time_confidence,
      birth_place_text: normalized.data.birth_place_text,
      latitude: normalized.data.latitude,
      longitude: normalized.data.longitude,
      timezone: normalized.data.timezone,
      ayanamsha: normalized.data.ayanamsha,
      engine_version: "pending",
      status: "processing",
    })
    .select("id")
    .single();

  if (insertError || !birthProfile) {
    return NextResponse.json({ error: insertError?.message ?? "Profile insert failed." }, { status: 500 });
  }

  // Kick off generation without blocking this API response.
  void (async () => {
    const backgroundClient = createClient();
    try {
      await generateProfileForBirthProfile({
        supabase: backgroundClient,
        birthProfileId: birthProfile.id,
        birthTimeConfidence: normalized.data.birth_time_confidence,
        input: {
          birth_date: normalized.data.birth_date,
          birth_time: normalized.data.birth_time,
          timezone: normalized.data.timezone,
          latitude: normalized.data.latitude,
          longitude: normalized.data.longitude,
          ayanamsha: normalized.data.ayanamsha,
        },
      });
      await track(
        backgroundClient,
        "profile_generated",
        { birth_time_confidence: normalized.data.birth_time_confidence },
        user.id,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown profile generation failure.";

      console.error("Profile generation failed", error);
      await backgroundClient.from("analytics_events").insert({
        user_id: user.id,
        event_name: "profile_generation_failed",
        properties: {
          birth_profile_id: birthProfile.id,
          reason: errorMessage,
        },
      });
    }
  })();

  return NextResponse.json({ birth_profile_id: birthProfile.id }, { status: 202 });
}
