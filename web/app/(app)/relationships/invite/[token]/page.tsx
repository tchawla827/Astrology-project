import Link from "next/link";

import { InviteAcceptPanel } from "@/components/relationships/InviteAcceptPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelationshipLabelSchema } from "@/lib/schemas";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function loadInvite(token: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("relationship_invites")
    .select("token,requester_birth_profile_id,requester_label,recipient_label,status,expires_at")
    .eq("token", token)
    .maybeSingle();
  const invite = asObject(data);
  if (!invite || invite.status !== "pending" || Date.parse(String(invite.expires_at)) <= Date.now()) {
    return null;
  }
  const { data: profileData } = await service
    .from("birth_profiles")
    .select("name")
    .eq("id", invite.requester_birth_profile_id)
    .maybeSingle();
  return {
    token: String(invite.token),
    requester_name: String(asObject(profileData)?.name ?? "A Naksha user"),
    requester_label: invite.requester_label,
    recipient_label: invite.recipient_label,
    expires_at: String(invite.expires_at),
  };
}

export default async function RelationshipInvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const invite = await loadInvite(params.token);

  if (!invite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This relationship invite is expired, revoked, or already used.</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to accept</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Relationship invites require a Naksha account with a ready chart.</p>
          <Link className="text-primary hover:underline" href={`/login?next=/relationships/invite/${params.token}`}>
            Continue to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  const requesterLabel = RelationshipLabelSchema.safeParse(invite.requester_label);
  const recipientLabel = RelationshipLabelSchema.safeParse(invite.recipient_label);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm uppercase tracking-[0.24em] text-primary">Relationship invite</p>
          <h1 className="mt-4 font-display text-4xl font-semibold">Accept {invite.requester_name}&apos;s invite</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Accepting unlocks a shared relationship workspace. It does not grant full chart browsing.
          </p>
        </div>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Confirm relationship labels</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteAcceptPanel
            recipientLabel={recipientLabel.success ? recipientLabel.data : "friend"}
            requesterLabel={requesterLabel.success ? requesterLabel.data : "friend"}
            requesterName={invite.requester_name}
            token={params.token}
          />
        </CardContent>
      </Card>
    </div>
  );
}
