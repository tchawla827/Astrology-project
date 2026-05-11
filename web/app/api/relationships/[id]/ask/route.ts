import { NextResponse } from "next/server";
import { z } from "zod";

import { LlmProviderError } from "@/lib/llm/errors";
import { generateRelationshipAnswer, type SupabaseRelationshipAskClient } from "@/lib/relationships/ask";
import { DepthModeSchema, ToneModeSchema } from "@/lib/schemas";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RelationshipAskRequestSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  tone: ToneModeSchema.default("direct"),
  depth: DepthModeSchema.default("simple"),
  session_id: z.string().uuid().optional(),
  day_context: z.object({ date: z.string().trim().min(10).max(10) }).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = RelationshipAskRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await generateRelationshipAnswer({
      supabase: service as unknown as SupabaseRelationshipAskClient,
      relationshipId: params.id,
      userId: user.id,
      question: parsed.data.question,
      tone: parsed.data.tone,
      depth: parsed.data.depth,
      sessionId: parsed.data.session_id,
      date: parsed.data.day_context?.date,
    });

    return NextResponse.json({
      answer: result.answer,
      llm_metadata: result.meta,
      session_id: result.session_id,
      assistant_message_id: result.assistant_message_id,
    });
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return NextResponse.json({ error: "Relationship Ask is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Relationship Ask failed." },
      { status: 500 },
    );
  }
}
