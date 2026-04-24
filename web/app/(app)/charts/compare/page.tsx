import Link from "next/link";

import { ChartSwitcher } from "@/components/charts/ChartSwitcher";
import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { DashboardErrorShell, DashboardProcessingShell } from "@/components/insights/DashboardStatusShell";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase text-primary">Chart explorer</p>
          <h1 className="mt-2 text-3xl font-semibold">Compare charts</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegenerateChartButton profileId={explorer.profileId} />
          <Link className="rounded-md border px-4 py-2 text-sm hover:bg-muted" href="/charts">
            Catalog
          </Link>
        </div>
      </div>

      <ChartSwitcher snapshot={explorer.snapshot} />
    </div>
  );
}
