import { Landmark } from "lucide-react";

import { StrengthBadge } from "@/components/life-areas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HouseBreakdown({
  houses,
}: {
  houses: Array<{ number: number; sign: string; strength: "high" | "medium" | "low"; summary: string }>;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <Landmark className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Chart architecture</p>
        </div>
        <CardTitle className="text-2xl">House breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {houses.map((house) => (
          <article className="rounded-lg border border-primary/15 bg-background/45 p-4" key={house.number}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-4xl font-semibold text-primary">{house.number}</p>
                <h3 className="mt-1 text-base font-semibold">{house.number}th house</h3>
                <p className="text-sm text-muted-foreground">{house.sign} sign</p>
              </div>
              <StrengthBadge strength={house.strength} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{house.summary}</p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
