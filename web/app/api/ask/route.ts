import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAnswer, type SupabaseAskPersistenceClient } from "@/lib/llm/generateAnswer";
import { LlmContextError, LlmProviderError } from "@/lib/llm/errors";
import { track } from "@/lib/analytics/events";
import { recordAskUsage } from "@/lib/quotas/askQuota";
import { DepthModeSchema, ToneModeSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const AskRequestSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  tone: ToneModeSchema.default("direct"),
  depth: DepthModeSchema.default("simple"),
  session_id: z.string().uuid().optional(),
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
  let query = input.supabase
    .from("birth_profiles")
    .select("id,status")
    .eq("user_id", input.userId);

  if (input.requestedProfileId) {
    query = query.eq("id", input.requestedProfileId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    return { error: error.message, status: 500 as const };
  }

  const profile = asProfileRow(data);
  if (!profile) {
    return { error: "No birth profile found for Ask Astrology.", status: 404 as const };
  }
  if (profile.status === "processing") {
    return { error: "Profile generation is still running.", status: 409 as const };
  }
  if (profile.status === "error") {
    return { error: "Profile generation failed. Regenerate the chart before asking.", status: 409 as const };
  }

  return { profileId: profile.id };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = AskRequestSchema.safeParse(await request.json().catch(() => null));
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
    const result = await generateAnswer({
      supabase: supabase as unknown as SupabaseAskPersistenceClient,
      profile_id: profile.profileId,
      question: parsed.data.question,
      tone: parsed.data.tone,
      depth: parsed.data.depth,
      session_id: parsed.data.session_id,
    });

    await recordAskUsage({ supabase, userId: user.id, askMessageId: result.assistant_message_id });
    await track(
      supabase,
      "ask_submitted",
      { topic: result.classification.topic, tone: parsed.data.tone, depth: parsed.data.depth },
      user.id,
    );

    return NextResponse.json({
      answer: result.answer,
      llm_metadata: result.meta,
      session_id: result.session_id,
      assistant_message_id: result.assistant_message_id,
      classification: result.classification,
    });
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return NextResponse.json(
        { error: "Ask Astrology is temporarily unavailable because all LLM providers failed." },
        { status: 503 },
      );
    }

    if (error instanceof LlmContextError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ask Astrology failed." },
      { status: 500 },
    );
  }
}
