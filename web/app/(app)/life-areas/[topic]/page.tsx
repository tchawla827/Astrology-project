import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Landmark, Orbit, Sparkles } from "lucide-react";

import { AskThisTopicCta } from "@/components/life-areas/AskThisTopicCta";
import { CurrentTiming } from "@/components/life-areas/CurrentTiming";
import { HeadlineSignals } from "@/components/life-areas/HeadlineSignals";
import { HouseBreakdown } from "@/components/life-areas/HouseBreakdown";
import { LifeAreaHeader } from "@/components/life-areas/LifeAreaHeader";
import { PlanetBreakdown } from "@/components/life-areas/PlanetBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
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
  await track(supabase, "life_area_viewed", { topic: params.topic }, user.id);

  return (
    <div className="space-y-8">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary" href="/life-areas">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to life area atlas
      </Link>
      <LifeAreaHeader
        confidence={viewModel.confidence}
        profileName={context.profile.name}
        subtitle={viewModel.headline_signals[0] ?? `${viewModel.title} report`}
        title={viewModel.title}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Headline signals", value: viewModel.headline_signals.length, icon: Sparkles },
          { label: "Houses tracked", value: viewModel.houses.length, icon: Landmark },
          { label: "Planets cited", value: viewModel.planets.length, icon: Orbit },
          { label: "Timing notes", value: viewModel.timing.notes.length, icon: CalendarClock },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="ritual-panel" key={item.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <HeadlineSignals signals={viewModel.headline_signals} />
          <HouseBreakdown houses={viewModel.houses} />
          <PlanetBreakdown planets={viewModel.planets} />
        </div>
        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <CurrentTiming timing={viewModel.timing} />
          <AskThisTopicCta topic={viewModel.topic} tone={context.defaultToneMode} />
        </aside>
      </div>
    </div>
  );
}
