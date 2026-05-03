import Link from "next/link";
import { notFound } from "next/navigation";

import { AskWorkspace } from "@/components/ask/AskWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkAskQuota, type SupabaseAskQuotaClient } from "@/lib/quotas/askQuota";
import {
  loadAskSessionSummaries,
  loadAskThread,
  type SupabaseAskUiClient,
} from "@/lib/server/loadAsk";
import { createClient } from "@/lib/supabase/server";

export default async function AskSessionPage({ params }: { params: { session_id: string } }) {
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

  const thread = await loadAskThread(supabase as unknown as SupabaseAskUiClient, user.id, params.session_id);
  if (!thread) {
    notFound();
  }

  const sessions = await loadAskSessionSummaries(
    supabase as unknown as SupabaseAskUiClient,
    thread.session.birth_profile_id,
  );
  const quota = await checkAskQuota({ supabase: supabase as unknown as SupabaseAskQuotaClient, userId: user.id });

  return (
    <AskWorkspace
      initialMessages={thread.messages}
      initialSessionId={thread.session.id}
      initialTone={thread.session.tone_mode}
      dayContextDate={thread.session.context_date}
      profileId={thread.session.birth_profile_id}
      quota={quota}
      sessions={sessions}
      starterQuestions={[]}
    />
  );
}
