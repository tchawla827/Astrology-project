import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultReciprocalLabel, parseRelationshipLabel } from "@/lib/relationships/labels";
import { generateRelationshipToken, getRelationshipInviteUrl } from "@/lib/relationships/tokens";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const CreateInviteSchema = z.object({
  requester_label: z.string().optional(),
  recipient_label: z.string().optional(),
});

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function latestReadyProfile(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("birth_profiles")
    .select("id,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  const row = asObject(data);
  if (!row || row.status !== "ready" || typeof row.id !== "string") {
    throw new Error("Create a ready birth profile before inviting someone.");
  }
  return row.id;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateInviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profileId = await latestReadyProfile(service, user.id);
    const requesterLabel = parseRelationshipLabel(parsed.data.requester_label);
    const recipientLabel = parseRelationshipLabel(parsed.data.recipient_label, defaultReciprocalLabel(requesterLabel));
    const token = generateRelationshipToken();
    const { data, error } = await service
      .from("relationship_invites")
      .insert({
        token,
        requester_user_id: user.id,
        requester_birth_profile_id: profileId,
        requester_label: requesterLabel,
        recipient_label: recipientLabel,
      })
      .select("id,token,expires_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      invite: data,
      invite_url: getRelationshipInviteUrl(token, request.headers.get("origin")),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create relationship invite." },
      { status: 400 },
    );
  }
}
