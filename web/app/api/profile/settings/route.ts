import { NextResponse } from "next/server";
import { z } from "zod";

import { generateProfileForBirthProfile } from "@/lib/server/generateProfile";
import { ToneModeSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const SettingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  default_tone_mode: ToneModeSchema.optional(),
  ayanamsha: z.enum(["lahiri", "raman", "kp"]).optional(),
});

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

async function regenerateInBackground(input: {
  userId: string;
  birthProfile: BirthProfileForRegeneration;
}) {
  const backgroundClient = createClient();
  try {
    await generateProfileForBirthProfile({
      supabase: backgroundClient,
      birthProfileId: input.birthProfile.id,
      birthTimeConfidence: input.birthProfile.birth_time_confidence,
      input: {
        birth_date: input.birthProfile.birth_date,
        birth_time: input.birthProfile.birth_time,
        timezone: input.birthProfile.timezone,
        latitude: input.birthProfile.latitude,
        longitude: input.birthProfile.longitude,
        ayanamsha: input.birthProfile.ayanamsha,
      },
    });
  } catch (error) {
    await backgroundClient.from("analytics_events").insert({
      user_id: input.userId,
      event_name: "profile_regeneration_failed",
      properties: {
        birth_profile_id: input.birthProfile.id,
        reason: error instanceof Error ? error.message : "Unknown profile regeneration failure.",
      },
    });
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = SettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const profilePatch: Record<string, string> = {};
  if (parsed.data.name !== undefined) {
    profilePatch.name = parsed.data.name;
  }
  if (parsed.data.default_tone_mode !== undefined) {
    profilePatch.default_tone_mode = parsed.data.default_tone_mode;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase.from("user_profiles").update(profilePatch).eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  let regenerationStarted = false;
  if (parsed.data.ayanamsha) {
    const { data, error } = await supabase
      .from("birth_profiles")
      .select("id,birth_date,birth_time,birth_time_confidence,latitude,longitude,timezone,ayanamsha")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const birthProfile = data as BirthProfileForRegeneration | null;
    if (birthProfile && birthProfile.ayanamsha !== parsed.data.ayanamsha) {
      const { error: updateError } = await supabase
        .from("birth_profiles")
        .update({ ayanamsha: parsed.data.ayanamsha, status: "processing" })
        .eq("id", birthProfile.id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      regenerationStarted = true;
      void regenerateInBackground({
        userId: user.id,
        birthProfile: { ...birthProfile, ayanamsha: parsed.data.ayanamsha },
      });
    }
  }

  return NextResponse.json({ saved: true, regeneration_started: regenerationStarted });
}
