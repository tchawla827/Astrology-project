import Link from "next/link";

import { StrengthBadge } from "@/components/life-areas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { topicTitles } from "@/lib/derived/shared";
import { mvpLifeAreaTopics, renderLifeArea } from "@/lib/life-areas/render";
import { loadLifeAreaContext, type SupabaseLifeAreaClient } from "@/lib/server/loadLifeArea";
import { createClient } from "@/lib/supabase/server";

export default async function LifeAreasIndexPage() {
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

  const context = await loadLifeAreaContext(supabase as unknown as SupabaseLifeAreaClient, user.id);

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

  if (context.status === "processing" || context.status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Life areas are not ready yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {context.errorMessage ?? "Profile generation is still running. Return after the chart snapshot is ready."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (context.status !== "ready") {
    return null;
  }

  const cards = mvpLifeAreaTopics.map((topic) =>
    renderLifeArea(topic, context.derived.topic_bundles[topic], context.snapshot, context.profile.birth_time_confidence),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-primary">Life Areas</p>
        <h1 className="text-3xl font-semibold">{context.profile.name}&apos;s structured reports</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          These pages stay deterministic: derived bundles, no interpretation layer, direct tone by default.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link href={`/life-areas/${card.topic}`} key={card.topic}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl">{topicTitles[card.topic]}</CardTitle>
                  <StrengthBadge strength={card.confidence.level} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{card.headline_signals[0]}</p>
                <p className="text-sm font-medium text-primary">Open report</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
