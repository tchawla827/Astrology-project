import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CircleDotDashed,
  Compass,
  Flame,
  HeartHandshake,
  Layers3,
  MessageSquareText,
  Moon,
  Orbit,
  Sparkles,
  Sunrise,
  Telescope,
  Timer,
} from "lucide-react";

import { BirthTimeBanner } from "@/components/common/BirthTimeBanner";
import { AskCtaCard } from "@/components/insights/AskCtaCard";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
import { FocusCard } from "@/components/insights/FocusCard";
import { ThemesCard } from "@/components/insights/ThemesCard";
import { DashboardPanchangStrip } from "@/components/panchang/DashboardPanchangStrip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
import { loadDashboard, type SupabaseDashboardClient } from "@/lib/server/loadDashboard";
import { loadPanchang, type SupabasePanchangClient } from "@/lib/server/loadPanchang";
import { createClient } from "@/lib/supabase/server";

const workspacePaths = [
  {
    href: "/charts",
    label: "Read the chart",
    area: "Interpret",
    copy: "Start with the core D1 view, then inspect divisional rooms when a life topic needs more detail.",
    icon: Telescope,
    chips: ["D1", "D9", "D10"],
  },
  {
    href: "/life-areas",
    label: "Study a life area",
    area: "Interpret",
    copy: "Move directly into career, wealth, marriage, health, family, spirituality, or relocation reports.",
    icon: Layers3,
    chips: ["Career", "Money", "Marriage"],
  },
  {
    href: "/ask",
    label: "Ask for counsel",
    area: "Act",
    copy: "Use your stored chart snapshot for a specific, answerable question with visible reasoning.",
    icon: MessageSquareText,
    chips: ["Tone", "Depth", "Why"],
  },
  {
    href: "/timeline",
    label: "Scan timing",
    area: "Act",
    copy: "Compare monthly strength by topic before choosing a date or asking about a window.",
    icon: Compass,
    chips: ["Year", "Month", "Topic"],
  },
  {
    href: "/daily/today",
    label: "Time a day",
    area: "Act",
    copy: "Check daily scores, caution periods, favorable windows, and transit triggers.",
    icon: CalendarDays,
    chips: ["Today", "Scores", "Export"],
  },
  {
    href: "/relationships",
    label: "Compare with someone",
    area: "Connect",
    copy: "Create a shared workspace for compatibility, friction, and relationship Ask sessions.",
    icon: HeartHandshake,
    chips: ["Invite", "Labels", "Shared Ask"],
  },
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
  void track(supabase, "dashboard_viewed", {}, user.id);

  const featuredInsight = dashboard.focusCards[0];
  const transitHighlight = dashboard.transits.highlights[0] ?? "No major transit highlight was flagged in this snapshot.";
  const identityItems = [
    { label: "Lagna", value: dashboard.summary.lagna, icon: Sunrise },
    { label: "Moon", value: dashboard.summary.moon_sign, icon: Moon },
    { label: "Nakshatra", value: `${dashboard.summary.nakshatra} pada ${dashboard.summary.pada}`, icon: Sparkles },
  ];
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

  return (
    <div className="space-y-7">
      <section className="cinematic-hero p-6 sm:p-8 lg:p-10">
        <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-end">
          <div className="max-w-4xl">
            <p className="section-kicker">Observatory</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">
              {dashboard.profile.name}&apos;s working map
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
              Start here for the current chart state, then choose the next room by intent: interpret, ask, time, or compare.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/ask">
                  Ask a chart question
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/charts">Open chart room</Link>
              </Button>
            </div>
          </div>

          <aside className="luxury-panel rounded-lg p-5">
            <div className="flex items-center gap-3 text-primary">
              <CircleDotDashed className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Source chart</p>
            </div>
            <div className="mt-5 grid gap-3">
              {identityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/55 p-4" key={item.label}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
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
          </aside>
        </div>
      </section>

      <BirthTimeBanner confidence={dashboard.profile.birth_time_confidence} />
      {panchang ? <DashboardPanchangStrip panchang={panchang.panchang} timezone={panchang.location.timezone} /> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_26rem]">
        <article className="workspace-band rounded-lg p-6 sm:p-7">
          <div className="flex items-center gap-3 text-primary">
            <Flame className="h-5 w-5" aria-hidden="true" />
            <p className="section-kicker">What needs attention now</p>
          </div>
          <h2 className="mt-5 text-3xl font-semibold">{featuredInsight.title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{featuredInsight.body}</p>
          <div className="mt-6 rounded-lg border border-primary/15 bg-background/55 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-primary">Current transit context</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{transitHighlight}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/timeline">Check timing graph</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/ask?question=What should I focus on right now?">Ask why this matters</Link>
            </Button>
          </div>
        </article>

        <aside className="rounded-lg border border-primary/20 bg-card/70 p-5 shadow-bronze">
          <div className="flex items-center gap-3 text-primary">
            <Timer className="h-5 w-5" aria-hidden="true" />
            <p className="section-kicker">Timing stack</p>
          </div>
          <div className="mt-5 space-y-4">
            {timingWindows.map((window, index) => {
              const Icon = window.icon;
              return (
                <div className="grid grid-cols-[2.75rem_1fr] gap-3" key={window.label}>
                  <div className="relative flex justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {index < timingWindows.length - 1 ? <span className="absolute top-11 h-8 w-px bg-primary/25" aria-hidden="true" /> : null}
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
        </aside>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Choose your next room</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">One map, six clear paths.</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/profile">Manage source data</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspacePaths.map((path) => {
            const Icon = path.icon;
            return (
              <Link
                className="group flex min-h-full flex-col rounded-lg border border-primary/15 bg-background/50 p-5 transition-colors hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={path.href}
                key={path.href}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-primary">{path.area}</p>
                      <h3 className="mt-1 text-xl font-semibold">{path.label}</h3>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{path.copy}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {path.chips.map((chip) => (
                    <span className="rounded-md border border-primary/15 bg-card/70 px-2.5 py-1 text-xs text-muted-foreground" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-1">{lowerCards}</div>
        <article className="luxury-panel rounded-lg p-6">
          <div className="flex items-center gap-3 text-primary">
            <Brain className="h-5 w-5" aria-hidden="true" />
            <p className="section-kicker">Reading order</p>
          </div>
          <h2 className="mt-5 text-3xl font-semibold">A cleaner route through the same chart.</h2>
          <ol className="mt-6 space-y-4 text-sm">
            {[
              "Use the Observatory for the current focus and timing stack.",
              "Open Charts or Life Areas when you need evidence behind a topic.",
              "Use Ask AI after you know the topic or exact timing window.",
            ].map((item, index) => (
              <li className="flex gap-3 rounded-lg border border-primary/15 bg-background/45 p-4" key={item}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="leading-6 text-muted-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      {dashboard.snapshotMeta ? (
        <p className="text-xs text-muted-foreground">
          Engine {dashboard.snapshotMeta.engine_version} / computed {formatDate(dashboard.snapshotMeta.computed_at)}
        </p>
      ) : null}
    </div>
  );
}
