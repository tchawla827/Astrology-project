import Link from "next/link";
import { ArrowRight, BookOpen, GitCompare, Layers3, PanelRightOpen, SlidersHorizontal, Telescope } from "lucide-react";

import { ChartView } from "@/components/charts/ChartView";
import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_GROUPS, CHART_LABELS } from "@/lib/charts/catalog";
import { loadChartExplorer, type SupabaseChartsClient } from "@/lib/server/loadCharts";
import { createClient } from "@/lib/supabase/server";

const interpretationPanels = [
  {
    title: "Read the promise",
    copy: "Start with D1 / Rashi for the core promise before moving into divisional charts.",
    icon: Telescope,
  },
  {
    title: "Compare life lenses",
    copy: "Use D9, D10, D7, D12, D30, and D60 to inspect marriage, career, children, lineage, difficulty, and subtle karma.",
    icon: GitCompare,
  },
  {
    title: "Open technical depth",
    copy: "Switch between simple and technical views to reveal houses, signs, planets, aspects, and yoga references.",
    icon: SlidersHorizontal,
  },
];

export default async function ChartsPage() {
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

  const explorer = await loadChartExplorer(supabase as unknown as SupabaseChartsClient, user.id);

  if (explorer.status === "empty") {
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

  if (explorer.status === "processing") {
    return <DashboardProcessingShell profileId={explorer.profileId} />;
  }

  if (explorer.status === "error") {
    return <DashboardErrorShell message={explorer.errorMessage} profileId={explorer.profileId} />;
  }

  return (
    <div className="space-y-8">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Chart explorer</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">
              {explorer.profile.name}&apos;s chart room
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Switch between foundational and divisional views, then open the technical layer when you need the machinery behind an interpretation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RegenerateChartButton profileId={explorer.profileId} />
            <Button asChild variant="outline">
              <Link href="/charts/compare">
                <GitCompare className="mr-2 h-4 w-4" aria-hidden="true" />
                Compare charts
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_21rem]">
        <aside className="space-y-4">
          <div className="luxury-panel rounded-lg p-4">
            <div className="flex items-center gap-3 text-primary">
              <Layers3 className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.18em]">Switch chart</p>
            </div>
            <div className="mt-4 space-y-5">
              {CHART_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{group.title}</p>
                  <div className="mt-2 grid gap-2">
                    {group.keys.map((key) => {
                      const isAvailable = Boolean(explorer.snapshot.charts[key]);
                      return (
                        <Link
                          aria-disabled={!isAvailable}
                          className="flex min-h-11 items-center justify-between rounded-md border border-primary/10 bg-background/45 px-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/10 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                          href={`/charts/${key}`}
                          key={key}
                        >
                          <span>
                            <span className="font-semibold text-primary">{key}</span>
                            <span className="ml-2 text-muted-foreground">{CHART_LABELS[key]}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary/80" aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <Card className="overflow-hidden border-primary/20 bg-background/55">
          <CardContent className="p-4 sm:p-6">
            <ChartView chartKey="D1" snapshot={explorer.snapshot} />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <div className="luxury-panel rounded-lg p-5">
            <div className="flex items-center gap-3 text-primary">
              <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.18em]">Interpretation</p>
            </div>
            <div className="mt-5 space-y-4">
              {interpretationPanels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <div className="rounded-lg border border-primary/15 bg-background/50 p-4" key={panel.title}>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="mt-3 text-lg font-semibold">{panel.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{panel.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <details className="rounded-lg border border-primary/20 bg-card/70 p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
              Technical details
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            </summary>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Use simple mode for readable placement scanning and technical mode for house/sign/planet inspection.</p>
              <p>Comparison mode is optimized for D1 versus D9, D10, Moon, and Bhava review.</p>
              <p>Click planets or houses in the visualization to open supporting drawers where available.</p>
            </div>
          </details>
        </aside>
      </section>
    </div>
  );
}
