import * as React from "react";
import { Moon, Sparkles, Sunrise } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardViewModel } from "@/lib/server/loadDashboard";

type Props = {
  summary: NonNullable<DashboardViewModel["summary"]>;
};

export function ProfileSummaryCard({ summary }: Props) {
  const items = [
    { label: "Lagna", value: summary.lagna, icon: Sunrise },
    { label: "Moon", value: summary.moon_sign, icon: Moon },
    { label: "Nakshatra", value: `${summary.nakshatra} pada ${summary.pada}`, icon: Sparkles },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Profile summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div className="flex items-center gap-3" key={item.label}>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
