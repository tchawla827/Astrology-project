import { NextResponse } from "next/server";

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

  void generateProfileForBirthProfile({
    supabase,
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
  }).catch((error) => {
    console.error("Profile generation failed", error);
  });

  return NextResponse.json({ birth_profile_id: birthProfile.id }, { status: 202 });
}

