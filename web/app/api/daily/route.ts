import { NextResponse } from "next/server";
import { z } from "zod";

import { LlmContextError, LlmProviderError } from "@/lib/llm/errors";
import { generateDailyPrediction, type SupabaseDailyClient } from "@/lib/server/generateDailyPrediction";
import { createClient } from "@/lib/supabase/server";
import { ToneModeSchema } from "@/lib/schemas";

const DailyQuerySchema = z.object({
  date: z.string().default("today"),
  tone: ToneModeSchema.default("direct"),
  profile_id: z.string().uuid().optional(),
});

type ProfileRow = {
  id: string;
  status: "processing" | "ready" | "error";
};

function asProfileRow(value: unknown): ProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ProfileRow>;
  if (typeof row.id === "string" && (row.status === "processing" || row.status === "ready" || row.status === "error")) {
    return row as ProfileRow;
  }
  return null;
}

async function resolveProfileId(input: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  requestedProfileId?: string;
}) {
  let query = input.supabase.from("birth_profiles").select("id,status").eq("user_id", input.userId);

  if (input.requestedProfileId) {
    query = query.eq("id", input.requestedProfileId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    return { error: error.message, status: 500 as const };
  }

  const profile = asProfileRow(data);
  if (!profile) {
    return { error: "No birth profile found for daily predictions.", status: 404 as const };
  }
  if (profile.status === "processing") {
    return { error: "Profile generation is still running.", status: 409 as const };
  }
  if (profile.status === "error") {
    return { error: "Profile generation failed. Regenerate the chart before opening daily predictions.", status: 409 as const };
  }

  return { profileId: profile.id };
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = DailyQuerySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    tone: url.searchParams.get("tone") ?? undefined,
    profile_id: url.searchParams.get("profile_id") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await resolveProfileId({
    supabase,
    userId: user.id,
    requestedProfileId: parsed.data.profile_id,
  });
  if ("error" in profile) {
    return NextResponse.json({ error: profile.error }, { status: profile.status });
  }

  try {
    const result = await generateDailyPrediction({
      supabase: supabase as unknown as SupabaseDailyClient,
      profile_id: profile.profileId,
      date: parsed.data.date,
      tone: parsed.data.tone,
    });

    return NextResponse.json({
      prediction: result.prediction,
      transits: result.transits,
      profile: result.profile,
      cache: result.cache,
      context: result.context,
    });
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return NextResponse.json(
        { error: "Daily predictions are temporarily unavailable because all LLM providers failed." },
        { status: 503 },
      );
    }

    if (error instanceof LlmContextError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Daily prediction failed." },
      { status: 500 },
    );
  }
}
