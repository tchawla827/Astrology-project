import { NextResponse } from "next/server";
import { z } from "zod";

import { computeRelationshipInsight, type SupabaseRelationshipInsightClient } from "@/lib/relationships/insights";
import { parseRelationshipLabel } from "@/lib/relationships/labels";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const RespondInviteSchema = z.object({
  action: z.enum(["accept", "decline", "block"]).default("accept"),
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
    throw new Error("Create a ready birth profile before accepting this relationship.");
  }
  return row.id;
}

async function loadInvite(supabase: ReturnType<typeof createServiceClient>, token: string) {
  const { data, error } = await supabase
    .from("relationship_invites")
    .select("id,token,requester_user_id,requester_birth_profile_id,requester_label,recipient_label,status,expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  const row = asObject(data);
  if (!row || typeof row.id !== "string" || typeof row.requester_user_id !== "string") {
    return null;
  }
  return row;
}

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const service = createServiceClient();
  try {
    const invite = await loadInvite(service, params.token);
    if (!invite || invite.status !== "pending" || Date.parse(String(invite.expires_at)) <= Date.now()) {
      return NextResponse.json({ error: "Relationship invite is not available." }, { status: 404 });
    }
    const { data: profileData } = await service
      .from("birth_profiles")
      .select("name")
      .eq("id", invite.requester_birth_profile_id)
      .maybeSingle();
    return NextResponse.json({
      invite: {
        token: invite.token,
        requester_name: asObject(profileData)?.name ?? "A Naksha user",
        requester_label: invite.requester_label,
        recipient_label: invite.recipient_label,
        expires_at: invite.expires_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load relationship invite." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const supabase = createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = RespondInviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const invite = await loadInvite(service, params.token);
    if (!invite || invite.status !== "pending" || Date.parse(String(invite.expires_at)) <= Date.now()) {
      return NextResponse.json({ error: "Relationship invite is not available." }, { status: 404 });
    }
    if (invite.requester_user_id === user.id) {
      return NextResponse.json({ error: "You cannot accept your own relationship invite." }, { status: 400 });
    }

    if (parsed.data.action === "block") {
      await service.from("relationship_blocks").upsert({
        blocker_user_id: user.id,
        blocked_user_id: invite.requester_user_id,
      }, { onConflict: "blocker_user_id,blocked_user_id" });
    }

    if (parsed.data.action === "decline" || parsed.data.action === "block") {
      const { error } = await service
        .from("relationship_invites")
        .update({ status: "declined", recipient_user_id: user.id, responded_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (error) {
        throw new Error(error.message);
      }
      return NextResponse.json({ ok: true });
    }

    const { data: blockData } = await service
      .from("relationship_blocks")
      .select("id")
      .eq("blocker_user_id", user.id)
      .eq("blocked_user_id", invite.requester_user_id)
      .maybeSingle();
    if (blockData) {
      return NextResponse.json({ error: "You blocked this requester." }, { status: 403 });
    }

    const recipientProfileId = await latestReadyProfile(service, user.id);
    const requesterLabel = parseRelationshipLabel(parsed.data.requester_label, parseRelationshipLabel(invite.requester_label));
    const recipientLabel = parseRelationshipLabel(parsed.data.recipient_label, parseRelationshipLabel(invite.recipient_label));
    const { data: relationshipData, error: relationshipError } = await service
      .from("relationships")
      .insert({ created_by: invite.requester_user_id })
      .select("id")
      .single();
    if (relationshipError || !relationshipData?.id) {
      throw new Error(relationshipError?.message ?? "Could not create relationship.");
    }

    const relationshipId = relationshipData.id;
    const { error: participantsError } = await service.from("relationship_participants").insert([
      {
        relationship_id: relationshipId,
        user_id: invite.requester_user_id,
        birth_profile_id: invite.requester_birth_profile_id,
        label_for_other: requesterLabel,
      },
      {
        relationship_id: relationshipId,
        user_id: user.id,
        birth_profile_id: recipientProfileId,
        label_for_other: recipientLabel,
      },
    ]);
    if (participantsError) {
      throw new Error(participantsError.message);
    }

    const { error: inviteError } = await service
      .from("relationship_invites")
      .update({
        status: "accepted",
        recipient_user_id: user.id,
        recipient_birth_profile_id: recipientProfileId,
        relationship_id: relationshipId,
        requester_label: requesterLabel,
        recipient_label: recipientLabel,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
    if (inviteError) {
      throw new Error(inviteError.message);
    }

    await computeRelationshipInsight({
      supabase: service as unknown as SupabaseRelationshipInsightClient,
      relationshipId,
      viewerUserId: user.id,
    });

    return NextResponse.json({ relationship_id: relationshipId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not respond to relationship invite." },
      { status: 500 },
    );
  }
}
