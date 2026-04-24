import Link from "next/link";
import { notFound } from "next/navigation";

import { AskThisTopicCta } from "@/components/life-areas/AskThisTopicCta";
import { CurrentTiming } from "@/components/life-areas/CurrentTiming";
import { HeadlineSignals } from "@/components/life-areas/HeadlineSignals";
import { HouseBreakdown } from "@/components/life-areas/HouseBreakdown";
import { LifeAreaHeader } from "@/components/life-areas/LifeAreaHeader";
import { PlanetBreakdown } from "@/components/life-areas/PlanetBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupportedLifeAreaTopic, renderLifeArea } from "@/lib/life-areas/render";
import { loadLifeAreaContext, type SupabaseLifeAreaClient } from "@/lib/server/loadLifeArea";
import { createClient } from "@/lib/supabase/server";

export default async function LifeAreaPage({ params }: { params: { topic: string } }) {
  if (!isSupportedLifeAreaTopic(params.topic)) {
    notFound();
  }

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
          <CardTitle>Life area report unavailable</CardTitle>
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

  const viewModel = renderLifeArea(
    params.topic,
    context.derived.topic_bundles[params.topic],
    context.snapshot,
    context.profile.birth_time_confidence,
  );

  return (
    <div className="space-y-6">
      <LifeAreaHeader
        confidence={viewModel.confidence}
        profileName={context.profile.name}
        subtitle={viewModel.headline_signals[0] ?? `${viewModel.title} report`}
        title={viewModel.title}
      />
      <HeadlineSignals signals={viewModel.headline_signals} />
      <HouseBreakdown houses={viewModel.houses} />
      <PlanetBreakdown planets={viewModel.planets} />
      <CurrentTiming timing={viewModel.timing} />
      <AskThisTopicCta topic={viewModel.topic} tone={context.defaultToneMode} />
    </div>
  );
}
