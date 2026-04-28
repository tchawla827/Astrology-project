import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CircleDollarSign, HeartHandshake, Sparkles } from "lucide-react";

import { StrengthBadge } from "@/components/life-areas/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { topicTitles } from "@/lib/derived/shared";
import { mvpLifeAreaTopics, renderLifeArea, type MvpLifeAreaTopic } from "@/lib/life-areas/render";
import { loadLifeAreaContext, type SupabaseLifeAreaClient } from "@/lib/server/loadLifeArea";
import { createClient } from "@/lib/supabase/server";

const topicVisuals: Record<MvpLifeAreaTopic, { icon: typeof Sparkles; label: string; copy: string }> = {
  personality: {
    icon: Sparkles,
    label: "Identity pattern",
    copy: "Character, instincts, strengths, blind spots, and the tone of your chart.",
  },
  career: {
    icon: BriefcaseBusiness,
    label: "Public role",
    copy: "Work direction, pressure points, recognition, craft, and professional timing.",
  },
  wealth: {
    icon: CircleDollarSign,
    label: "Resources",
    copy: "Money habits, earning channels, savings pressure, and material stability.",
  },
  relationships: {
    icon: HeartHandshake,
    label: "Bond dynamics",
    copy: "Attachment patterns, partnership needs, conflict themes, and emotional exchange.",
  },
};

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
    <div className="space-y-8">
      <section className="cinematic-hero p-6 sm:p-8 lg:p-10">
        <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="grid gap-8 lg:grid-cols-[1fr_21rem] lg:items-end">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Life area atlas</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">
              {context.profile.name}&apos;s chart rooms
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
              Each room turns the same birth snapshot into a focused report: houses, planets, timing, and confidence shown as structured signals instead of loose prose.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/ask">
                  Ask from your chart
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/charts">Open chart room</Link>
              </Button>
            </div>
          </div>

          <div className="luxury-panel rounded-lg p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Current timing lens</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-lg border border-primary/15 bg-background/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mahadasha</p>
                <p className="mt-1 text-xl font-semibold">{cards[0]?.timing.mahadasha ?? "Pending"}</p>
              </div>
              <div className="rounded-lg border border-primary/15 bg-background/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Antardasha</p>
                <p className="mt-1 text-xl font-semibold">{cards[0]?.timing.antardasha ?? "Pending"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const topic = card.topic as MvpLifeAreaTopic;
          const visual = topicVisuals[topic];
          return (
          <Link className="group block h-full" href={`/life-areas/${card.topic}`} key={card.topic}>
            <Card className="relative h-full overflow-hidden transition-colors hover:border-primary/55 hover:bg-primary/10">
              <div className="celestial-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-30" aria-hidden="true" />
              <CardHeader className="relative space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                    {(() => {
                      const Icon = visual.icon;
                      return <Icon className="h-5 w-5" aria-hidden="true" />;
                    })()}
                  </span>
                  <StrengthBadge strength={card.confidence.level} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">{visual.label}</p>
                  <CardTitle className="mt-2 text-2xl">{topicTitles[card.topic]}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-5">
                <p className="text-sm leading-6 text-muted-foreground">{visual.copy}</p>
                <div className="rounded-lg border border-primary/15 bg-background/50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Primary signal</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6">{card.headline_signals[0]}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md border border-primary/10 bg-background/45 p-3">
                    <p className="text-primary">{card.houses.length}</p>
                    <p>houses</p>
                  </div>
                  <div className="rounded-md border border-primary/10 bg-background/45 p-3">
                    <p className="text-primary">{card.planets.length}</p>
                    <p>planets</p>
                  </div>
                </div>
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  Open report
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </p>
              </CardContent>
            </Card>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
