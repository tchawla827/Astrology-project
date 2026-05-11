import { NextResponse } from "next/server";

import { computeRelationshipInsight, type SupabaseRelationshipInsightClient } from "@/lib/relationships/insights";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function isParticipant(service: ReturnType<typeof createServiceClient>, relationshipId: string, userId: string) {
  const { data, error } = await service
    .from("relationship_participants")
    .select("id")
    .eq("relationship_id", relationshipId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await isParticipant(service, params.id, user.id))) {
      return NextResponse.json({ error: "Relationship not found." }, { status: 404 });
    }
    const insight = await computeRelationshipInsight({
      supabase: service as unknown as SupabaseRelationshipInsightClient,
      relationshipId: params.id,
      viewerUserId: user.id,
    });
    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate relationship insight." },
      { status: 500 },
    );
  }
}
