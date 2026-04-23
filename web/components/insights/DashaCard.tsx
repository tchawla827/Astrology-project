import * as React from "react";
import { Clock3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardViewModel } from "@/lib/server/loadDashboard";

type Props = {
  dasha: NonNullable<DashboardViewModel["dasha"]>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function remainingLabel(endDate: string) {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.ceil((end - now) / 86_400_000));
  if (days >= 365) {
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m left`;
  }
  if (days >= 30) {
    return `${Math.floor(days / 30)}m ${days % 30}d left`;
  }
  return `${days}d left`;
}

export function DashaCard({ dasha }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
          Current dasha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Mahadasha</p>
          <p className="mt-1 text-2xl font-semibold">{dasha.current_mahadasha.lord}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ends {formatDate(dasha.current_mahadasha.end)} · {remainingLabel(dasha.current_mahadasha.end)}
          </p>
        </div>
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs uppercase text-muted-foreground">Antardasha</p>
          <p className="mt-1 font-medium">{dasha.current_antardasha.lord}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(dasha.current_antardasha.start)} to {formatDate(dasha.current_antardasha.end)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
