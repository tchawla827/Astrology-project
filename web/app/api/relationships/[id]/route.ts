import { NextResponse } from "next/server";

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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
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
    const { error } = await service
      .from("relationships")
      .update({ status: "revoked", revoked_by: user.id, revoked_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not revoke relationship." },
      { status: 500 },
    );
  }
}
