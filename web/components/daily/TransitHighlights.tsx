import type { TransitRuleHit } from "@/lib/server/generateDailyPrediction";

export function TransitHighlights({ hits }: { hits: TransitRuleHit[] }) {
  if (hits.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Transit highlights</h2>
        <p className="mt-3 text-sm text-muted-foreground">No major rule-based transit trigger fired for this date.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">Transit highlights</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {hits.map((hit) => (
          <li className="flex items-start justify-between gap-3" key={`${hit.rule}-${hit.planet}-${hit.house ?? "orb"}`}>
            <span>{hit.note}</span>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{hit.rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
