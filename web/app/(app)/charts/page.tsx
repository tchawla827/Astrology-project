import Link from "next/link";

import { ChartView } from "@/components/charts/ChartView";
import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_GROUPS, CHART_LABELS } from "@/lib/charts/catalog";
import { loadChartExplorer, type SupabaseChartsClient } from "@/lib/server/loadCharts";
import { createClient } from "@/lib/supabase/server";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase text-primary">Chart explorer</p>
          <h1 className="mt-2 text-3xl font-semibold">{explorer.profile.name}&apos;s chart catalog</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegenerateChartButton profileId={explorer.profileId} />
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/charts/compare">
            Compare charts
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="p-6">
            <ChartView chartKey="D1" snapshot={explorer.snapshot} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          {CHART_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle className="text-lg">{group.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.keys.map((key) => {
                    const isAvailable = Boolean(explorer.snapshot.charts[key]);
                    return (
                      <Link
                        aria-disabled={!isAvailable}
                        className="rounded-md border bg-background/40 p-3 text-sm transition-colors hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50"
                        href={`/charts/${key}`}
                        key={key}
                      >
                        <span className="font-medium">{key}</span>
                        <span className="ml-2 text-muted-foreground">{CHART_LABELS[key]}</span>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
