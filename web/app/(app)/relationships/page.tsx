import Link from "next/link";
import { HeartHandshake, Link2, ShieldCheck } from "lucide-react";

import { RelationshipInviteForm } from "@/components/relationships/RelationshipInviteForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labelText } from "@/lib/relationships/labels";
import { loadRelationshipsIndex, type SupabaseRelationshipsClient } from "@/lib/server/loadRelationships";
import { createClient } from "@/lib/supabase/server";

export default async function RelationshipsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className="text-primary hover:underline" href="/login">
            Continue to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  const index = await loadRelationshipsIndex(supabase as unknown as SupabaseRelationshipsClient, user.id);

  return (
    <div className="space-y-8">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <div className="flex items-center gap-3 text-primary">
            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm uppercase tracking-[0.24em]">Relationships</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">Shared chart workspaces</h1>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Invite someone, confirm the relationship labels, then read compatibility, friction, timing, and shared Ask AI from both charts.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Active relationships</h2>
          </div>
          {index.relationships.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {index.relationships.map((relationship) => (
                <Card className="border-primary/20 bg-card/70" key={relationship.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-2xl">{relationship.other_name}</CardTitle>
                      <Badge>{labelText(relationship.self_label)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      They are your {labelText(relationship.other_label).toLowerCase()}. You are their{" "}
                      {labelText(relationship.self_label).toLowerCase()}.
                    </p>
                    <Button asChild>
                      <Link href={`/relationships/${relationship.id}`}>Open workspace</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">No active relationship workspaces yet.</p>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-5">
          <Card className="border-primary/20 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3 text-primary">
                <Link2 className="h-5 w-5" aria-hidden="true" />
                <CardTitle className="text-xl">Create invite</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <RelationshipInviteForm />
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/70">
            <CardHeader>
              <CardTitle className="text-xl">Pending links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {index.invites.length > 0 ? (
                index.invites.map((invite) => (
                  <div className="rounded-md border border-primary/15 bg-background/50 p-3" key={invite.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{invite.status}</Badge>
                      <span className="text-sm">{labelText(invite.requester_label)} / {labelText(invite.recipient_label)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pending invite links.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
