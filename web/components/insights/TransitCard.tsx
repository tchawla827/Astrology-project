import * as React from "react";
import { Orbit } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardViewModel } from "@/lib/server/loadDashboard";

type Props = {
  transits: NonNullable<DashboardViewModel["transits"]>;
};

function formatAsOf(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TransitCard({ transits }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Orbit className="h-4 w-4 text-primary" aria-hidden="true" />
          Transit highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">As of {formatAsOf(transits.as_of)}</p>
        {transits.highlights.length > 0 ? (
          <ul className="space-y-3">
            {transits.highlights.map((highlight) => (
              <li className="rounded-md border bg-background/40 p-3 text-sm" key={highlight}>
                {highlight}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
            No major transit highlights were flagged in this snapshot.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
