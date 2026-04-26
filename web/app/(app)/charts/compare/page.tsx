import Link from "next/link";

import { ChartSwitcher } from "@/components/charts/ChartSwitcher";
import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadChartExplorer, type SupabaseChartsClient } from "@/lib/server/loadCharts";
import { createClient } from "@/lib/supabase/server";

export default async function ChartComparePage() {
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
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Chart explorer</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">Compare charts</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <RegenerateChartButton profileId={explorer.profileId} />
            <Button asChild variant="outline">
              <Link href="/charts">Catalog</Link>
            </Button>
          </div>
        </div>
      </section>

      <ChartSwitcher snapshot={explorer.snapshot} />
    </div>
  );
}
