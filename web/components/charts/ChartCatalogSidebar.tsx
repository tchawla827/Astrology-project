import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";

import { CHART_GROUPS, CHART_LABELS, type SupportedChartKey } from "@/lib/charts/catalog";
import type { ChartSnapshot } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function ChartCatalogSidebar({
  currentKey,
  snapshot,
}: {
  currentKey?: SupportedChartKey;
  snapshot: ChartSnapshot;
}) {
  return (
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
                  const isAvailable = Boolean(snapshot.charts[key]);
                  const isActive = currentKey === key;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      aria-disabled={!isAvailable}
                      className={cn(
                        "flex min-h-11 items-center justify-between rounded-md border border-primary/10 bg-background/45 px-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/10 aria-disabled:pointer-events-none aria-disabled:opacity-50",
                        isActive && "border-primary/50 bg-primary/15 text-foreground",
                      )}
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
  );
}
