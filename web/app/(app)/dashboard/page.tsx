import Link from "next/link";

import { BirthTimeBanner } from "@/components/common/BirthTimeBanner";
import { AskCtaCard } from "@/components/insights/AskCtaCard";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
import { DashaCard } from "@/components/insights/DashaCard";
import { FocusCard } from "@/components/insights/FocusCard";
import { ProfileSummaryCard } from "@/components/insights/ProfileSummaryCard";
import { ThemesCard } from "@/components/insights/ThemesCard";
import { TransitCard } from "@/components/insights/TransitCard";
import { DashboardPanchangStrip } from "@/components/panchang/DashboardPanchangStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
import { loadDashboard, type SupabaseDashboardClient } from "@/lib/server/loadDashboard";
import { loadPanchang, type SupabasePanchangClient } from "@/lib/server/loadPanchang";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase text-primary">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold">{dashboard.profile.name}&apos;s chart snapshot</h1>
        </div>
        {dashboard.snapshotMeta ? (
          <p className="text-sm text-muted-foreground">Engine {dashboard.snapshotMeta.engine_version}</p>
        ) : null}
      </div>

      <BirthTimeBanner confidence={dashboard.profile.birth_time_confidence} />
      {panchang ? <DashboardPanchangStrip panchang={panchang.panchang} timezone={panchang.location.timezone} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <ProfileSummaryCard summary={dashboard.summary} />
        <DashaCard dasha={dashboard.dasha} />
        <TransitCard transits={dashboard.transits} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">{lowerCards}</div>
    </div>
  );
}
