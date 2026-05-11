import Link from "next/link";
import { notFound } from "next/navigation";

import { RelationshipWorkspace } from "@/components/relationships/RelationshipWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadRelationshipWorkspace, type SupabaseRelationshipsClient } from "@/lib/server/loadRelationships";
import { ToneModeSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export default async function RelationshipPage({ params }: { params: { relationship_id: string } }) {
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

  const [{ data: userProfile }, workspace] = await Promise.all([
    supabase.from("user_profiles").select("default_tone_mode").eq("id", user.id).maybeSingle(),
    loadRelationshipWorkspace({
      supabase: supabase as unknown as SupabaseRelationshipsClient,
      userId: user.id,
      relationshipId: params.relationship_id,
    }),
  ]);

  if (!workspace) {
    notFound();
  }

  const tone = ToneModeSchema.safeParse((userProfile as { default_tone_mode?: unknown } | null)?.default_tone_mode);

  return (
    <RelationshipWorkspace
      defaultTone={tone.success ? tone.data : "direct"}
      insight={workspace.insight}
      relationship={workspace.relationship}
      sessions={workspace.sessions}
    />
  );
}
