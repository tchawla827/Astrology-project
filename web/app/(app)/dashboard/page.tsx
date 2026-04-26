import Link from "next/link";
import { ArrowRight, Brain, CalendarDays, Flame, Moon, Orbit, Sparkles, Sunrise, Telescope, Timer } from "lucide-react";

import { BirthTimeBanner } from "@/components/common/BirthTimeBanner";
import { AskCtaCard } from "@/components/insights/AskCtaCard";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
import { DashaCard } from "@/components/insights/DashaCard";
import { FocusCard } from "@/components/insights/FocusCard";
import { ProfileSummaryCard } from "@/components/insights/ProfileSummaryCard";
import { ThemesCard } from "@/components/insights/ThemesCard";
import { TransitCard } from "@/components/insights/TransitCard";
import { DashboardPanchangStrip } from "@/components/panchang/DashboardPanchangStrip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
import { loadDashboard, type SupabaseDashboardClient } from "@/lib/server/loadDashboard";
import { loadPanchang, type SupabasePanchangClient } from "@/lib/server/loadPanchang";
import { createClient } from "@/lib/supabase/server";

const chartTiles = [
  { key: "D1", label: "Rashi", copy: "Core identity, planets, signs, and house structure." },
  { key: "Bhava", label: "Bhava", copy: "House-centered view for practical life topics." },
  { key: "Moon", label: "Chandra Lagna", copy: "Mind, emotional pattern, and lunar emphasis." },
  { key: "D9", label: "Navamsa", copy: "Dharma, marriage, maturity, and deeper promise." },
  { key: "D10", label: "Dashamsa", copy: "Work, public role, and professional direction." },
  { key: "D60", label: "Shashtiamsa", copy: "Subtle karmic texture for advanced review." },
];

const lifeAreas = [
  { href: "/life-areas/career", label: "Career" },
  { href: "/life-areas/wealth", label: "Money" },
  { href: "/life-areas/marriage", label: "Marriage" },
  { href: "/life-areas/family", label: "Family" },
  { href: "/life-areas/spirituality", label: "Spirituality" },
  { href: "/life-areas/health", label: "Health" },
];

function orderLowerCards(intent: string | null | undefined, cards: React.ReactNode[]) {
  if (!intent) {
    return cards;
  }

  const preferredIndex = intent === "know-self" ? 1 : intent === "full-chart" ? 2 : 0;
  const preferred = cards[preferredIndex];
  if (!preferred) {
    return cards;
  }
  return [preferred, ...cards.filter((_, index) => index !== preferredIndex)];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function DashboardPage() {
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

  const dashboard = await loadDashboard(supabase as unknown as SupabaseDashboardClient, user.id);

  if (dashboard.status === "empty") {
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

  if (dashboard.status === "processing" && dashboard.profileId) {
    return <DashboardProcessingShell profileId={dashboard.profileId} />;
  }

  if (dashboard.status === "error" && dashboard.profileId) {
    return <DashboardErrorShell message={dashboard.errorMessage} profileId={dashboard.profileId} />;
  }

  if (
    dashboard.status !== "ready" ||
    !dashboard.profile ||
    !dashboard.summary ||
    !dashboard.dasha ||
    !dashboard.transits ||
    !dashboard.topThemes ||
    !dashboard.focusCards?.[0] ||
    !dashboard.askQuestions
  ) {
    return <DashboardErrorShell message={dashboard.errorMessage ?? "Dashboard data is incomplete."} profileId={dashboard.profileId ?? ""} />;
  }

  const lowerCards = orderLowerCards(dashboard.onboardingIntent, [
    <FocusCard focus={dashboard.focusCards[0]} key="focus" />,
    <ThemesCard themes={dashboard.topThemes} key="themes" />,
    <AskCtaCard questions={dashboard.askQuestions} key="ask" />,
  ]);
  const panchang = await loadPanchang({
    supabase: supabase as unknown as SupabasePanchangClient,
    userId: user.id,
    profileId: dashboard.profile.id,
    date: "today",
  }).catch(() => null);
  await track(supabase, "dashboard_viewed", {}, user.id);

  const timingWindows = [
    {
      label: "Mahadasha",
      title: dashboard.dasha.current_mahadasha.lord,
      copy: `Until ${formatDate(dashboard.dasha.current_mahadasha.end)}`,
      icon: CalendarDays,
    },
    {
      label: "Antardasha",
      title: dashboard.dasha.current_antardasha.lord,
      copy: `${formatDate(dashboard.dasha.current_antardasha.start)} to ${formatDate(dashboard.dasha.current_antardasha.end)}`,
      icon: Orbit,
    },
    {
      label: "Next shift",
      title: dashboard.dasha.upcoming[0]?.lord ?? "Pending",
      copy: dashboard.dasha.upcoming[0] ? `Begins ${formatDate(dashboard.dasha.upcoming[0].start)}` : "No upcoming period in snapshot",
      icon: Sparkles,
    },
  ];
  const featuredInsight = dashboard.focusCards[0];
  const transitHighlight = dashboard.transits.highlights[0] ?? "No major transit highlight was flagged in this snapshot.";

  return (
    <div className="space-y-8">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8 lg:p-10">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Personal cosmic observatory</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">
              {dashboard.profile.name}&apos;s living chart
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your chart identity, timing pressure, life-area signals, and Ask AI entry points in one cinematic workspace.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/ask">
                  Ask a chart question
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/charts">Open charts</Link>
              </Button>
            </div>
          </div>

          <div className="luxury-panel rounded-lg p-5">
            <div className="grid gap-4">
              {[
                { label: "Lagna", value: dashboard.summary.lagna, icon: Sunrise },
                { label: "Moon sign", value: dashboard.summary.moon_sign, icon: Moon },
                { label: "Nakshatra", value: `${dashboard.summary.nakshatra} pada ${dashboard.summary.pada}`, icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/55 p-4" key={item.label}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 font-semibold">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <BirthTimeBanner confidence={dashboard.profile.birth_time_confidence} />
      {panchang ? <DashboardPanchangStrip panchang={panchang.panchang} timezone={panchang.location.timezone} /> : null}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="luxury-panel rounded-lg p-6">
          <div className="flex items-center gap-3 text-primary">
            <Flame className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm uppercase tracking-[0.22em]">Featured prediction</p>
          </div>
          <h2 className="mt-5 text-3xl font-semibold">{featuredInsight.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{featuredInsight.body}</p>
          <div className="mt-6 rounded-lg border border-primary/15 bg-background/55 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-primary">Current cosmic phase</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{transitHighlight}</p>
          </div>
        </article>

        <article className="rounded-lg border border-primary/20 bg-card/70 p-6 shadow-bronze">
          <div className="flex items-center gap-3 text-primary">
            <TimerIcon />
            <p className="text-sm uppercase tracking-[0.22em]">Important timing windows</p>
          </div>
          <div className="mt-6 space-y-4">
            {timingWindows.map((window, index) => {
              const Icon = window.icon;
              return (
                <div className="grid gap-4 sm:grid-cols-[3rem_1fr]" key={window.label}>
                  <div className="relative flex justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {index < timingWindows.length - 1 ? <span className="absolute top-12 h-8 w-px bg-primary/25" aria-hidden="true" /> : null}
                  </div>
                  <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{window.label}</p>
                    <p className="mt-1 text-xl font-semibold">{window.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{window.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <ProfileSummaryCard summary={dashboard.summary} />
        <DashaCard dasha={dashboard.dasha} />
        <TransitCard transits={dashboard.transits} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-primary">Chart access</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">Open the rooms that matter now.</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/charts">View all charts</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {chartTiles.map((chart) => (
            <Link
              className="group rounded-lg border border-primary/15 bg-card/70 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] transition-colors hover:border-primary/45 hover:bg-primary/10"
              href={`/charts/${chart.key}`}
              key={chart.key}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary">{chart.key}</p>
                  <h3 className="mt-2 text-xl font-semibold">{chart.label}</h3>
                </div>
                <Telescope className="h-5 w-5 text-primary transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{chart.copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-1">{lowerCards}</div>
        <div className="luxury-panel rounded-lg p-6">
          <div className="flex items-center gap-3 text-primary">
            <Brain className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm uppercase tracking-[0.22em]">Life area overview</p>
          </div>
          <h2 className="mt-5 text-3xl font-semibold">Inspect the themes behind the headline.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Each area pulls from the chart snapshot, current timing, and derived feature bundles.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {lifeAreas.map((area) => (
              <Link
                className="flex min-h-14 items-center justify-between rounded-lg border border-primary/15 bg-background/50 px-4 text-sm transition-colors hover:border-primary/45 hover:bg-primary/10"
                href={area.href}
                key={area.href}
              >
                <span>{area.label}</span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {dashboard.snapshotMeta ? (
        <p className="text-xs text-muted-foreground">
          Engine {dashboard.snapshotMeta.engine_version} / computed {formatDate(dashboard.snapshotMeta.computed_at)}
        </p>
      ) : null}
    </div>
  );
}

function TimerIcon() {
  return <Timer className="h-5 w-5" aria-hidden="true" />;
}
