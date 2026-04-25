import Link from "next/link";

import { AskWorkspace } from "@/components/ask/AskWorkspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAskShellContext, type SupabaseAskUiClient } from "@/lib/server/loadAsk";
import { ToneModeSchema, TopicSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export default async function AskPage({
  searchParams,
}: {
  searchParams?: { topic?: string; tone?: string; question?: string };
}) {
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

  const topic = TopicSchema.safeParse(searchParams?.topic).success ? TopicSchema.parse(searchParams?.topic) : undefined;
  const tone = ToneModeSchema.safeParse(searchParams?.tone).success ? ToneModeSchema.parse(searchParams?.tone) : undefined;
  const context = await loadAskShellContext(supabase as unknown as SupabaseAskUiClient, user.id, topic);

  if (context.status === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create your first profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className="text-primary hover:underline" href="/welcome">
            Start onboarding
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (context.status !== "ready") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ask Astrology is not ready yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {context.errorMessage ?? "Profile generation is still running. Return after the chart snapshot is ready."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AskWorkspace
      initialQuestion={searchParams?.question ?? ""}
      initialTone={tone ?? context.defaultToneMode}
      profileId={context.profileId}
      sessions={context.sessions}
      starterQuestions={context.starterQuestions}
    />
  );
}
