import { NextResponse, type NextRequest } from "next/server";

import { generateProfileForBirthProfile } from "@/lib/server/generateProfile";
import { createClient } from "@/lib/supabase/server";

type BirthProfileForRegeneration = {
  id: string;
  birth_date: string;
  birth_time: string;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: "lahiri" | "raman" | "kp";
};

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("birth_profiles")
    .select("id,birth_date,birth_time,birth_time_confidence,latitude,longitude,timezone,ayanamsha")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const birthProfile = profile as BirthProfileForRegeneration;
  const { error: updateError } = await supabase.from("birth_profiles").update({ status: "processing" }).eq("id", params.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  void (async () => {
    const backgroundClient = createClient();
    try {
      await generateProfileForBirthProfile({
        supabase: backgroundClient,
        birthProfileId: birthProfile.id,
        birthTimeConfidence: birthProfile.birth_time_confidence,
        input: {
          birth_date: birthProfile.birth_date,
          birth_time: birthProfile.birth_time,
          timezone: birthProfile.timezone,
          latitude: birthProfile.latitude,
          longitude: birthProfile.longitude,
          ayanamsha: birthProfile.ayanamsha,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown profile regeneration failure.";
      console.error("Profile regeneration failed", error);
      await backgroundClient.from("analytics_events").insert({
        user_id: user.id,
        event_name: "profile_regeneration_failed",
        properties: {
          birth_profile_id: birthProfile.id,
          reason: errorMessage,
        },
      });
    }
  })();

  return NextResponse.json({ birth_profile_id: birthProfile.id }, { status: 202 });
}
