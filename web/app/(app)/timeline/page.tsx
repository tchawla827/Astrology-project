import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, LineChart } from "lucide-react";

import { LifeAreaTimingGraph, TimingMonthDrilldown } from "@/components/timeline/LifeAreaTimingGraph";
import { TimelinePendingShell } from "@/components/timeline/TimelinePendingShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTimelineContext, type SupabaseTimelineClient } from "@/lib/server/loadTimeline";
import { createClient } from "@/lib/supabase/server";
import {
  isLifeAreaTimingTopic,
  lifeAreaTimingTopicTitles,
  lifeAreaTimingTopics,
  type LifeAreaTimingTopic,
} from "@/lib/timeline/scoring";
import { cn } from "@/lib/utils";

type TimelineSearchParams = {
  area?: string | string[];
  year?: string | string[];
  month?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseYear(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value));
  const current = new Date().getFullYear();
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200 ? parsed : current;
}

function parseMonth(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value));
  const current = new Date().getMonth() + 1;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : current;
}

function parseTopic(value: string | string[] | undefined): LifeAreaTimingTopic {
  const topic = firstParam(value);
  return topic && isLifeAreaTimingTopic(topic) ? topic : "career";
}

function hrefFor(topic: LifeAreaTimingTopic, year: number, month: number) {
  return `/timeline?area=${topic}&year=${year}&month=${month}`;
}

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function TimelinePage({ searchParams }: { searchParams: TimelineSearchParams }) {
  const topic = parseTopic(searchParams.area);
  const year = parseYear(searchParams.year);
  const selectedMonth = parseMonth(searchParams.month);
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

  const context = await loadTimelineContext({
    supabase: supabase as unknown as SupabaseTimelineClient,
    userId: user.id,
    topic,
    year,
    selectedMonth,
  });

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
          <CardTitle>Timing graph unavailable</CardTitle>
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

  return (
    <TimelinePendingShell routeKey={`${topic}:${year}:${selectedMonth}`}>
      <section className="cinematic-hero p-6 sm:p-8 lg:p-10">
        <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-primary">
              <LineChart className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm uppercase tracking-[0.22em]">Timing graph</p>
            </div>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">
              {lifeAreaTimingTopicTitles[topic]} timing graph
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              {context.profile.name} · {year} · daily sampled monthly aggregate
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={hrefFor(topic, year - 1, selectedMonth)}>
                <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                {year - 1}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={hrefFor(topic, year + 1, selectedMonth)}>
                {year + 1}
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-10">
        {lifeAreaTimingTopics.map((area) => (
          <Link
            className={cn(
              "rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              area === topic
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-primary/15 bg-card/55 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            href={hrefFor(area, year, selectedMonth)}
            key={area}
          >
            {lifeAreaTimingTopicTitles[area]}
          </Link>
        ))}
      </section>

      <section className="flex gap-2 overflow-x-auto">
        {monthLabels.map((label, index) => {
          const month = index + 1;
          return (
            <Link
              className={cn(
                "flex min-h-10 min-w-16 items-center justify-center rounded-md border px-3 text-sm transition-colors",
                month === selectedMonth
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-primary/15 bg-card/55 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              href={hrefFor(topic, year, month)}
              key={label}
            >
              {label}
            </Link>
          );
        })}
      </section>

      <LifeAreaTimingGraph selectedMonth={selectedMonth} series={context.series} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <TimingMonthDrilldown points={context.series.daily ?? []} />
        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                <p className="text-xs uppercase tracking-[0.18em]">Selected month</p>
              </div>
              <CardTitle className="text-2xl">{monthLabels[selectedMonth - 1]} {year}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(context.series.monthly[selectedMonth - 1]?.top_factors ?? []).slice(0, 4).map((factor) => (
                <div className="rounded-lg border border-primary/15 bg-background/45 p-4" key={`${factor.source}:${factor.label}`}>
                  <p className="text-sm font-semibold">{factor.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{factor.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </TimelinePendingShell>
  );
}
