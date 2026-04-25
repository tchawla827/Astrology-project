import Link from "next/link";
import React from "react";

import { currentMuhurtaStatus } from "@/components/panchang/MuhurtaTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Panchang } from "@/lib/schemas";

export function DashboardPanchangStrip({ panchang, timezone }: { panchang: Panchang; timezone?: string }) {
  const status = currentMuhurtaStatus(panchang.muhurta_windows, new Date(), timezone);

  return (
    <Link href="/panchang">
      <Card className="transition-colors hover:bg-muted/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase text-primary">Today&apos;s panchang</p>
            <p className="mt-1 font-medium">
              {panchang.tithi.name} <span aria-hidden="true">&middot;</span> {panchang.nakshatra.name}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium",
              status.label === "auspicious"
                ? "bg-emerald-100 text-emerald-800"
                : status.label === "avoid"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {status.label}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
