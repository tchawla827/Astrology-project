import { Orbit } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlanetBreakdown({
  planets,
}: {
  planets: Array<{ name: string; role: string; summary: string }>;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <Orbit className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Planetary cast</p>
        </div>
        <CardTitle className="text-2xl">Planet breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {planets.map((planet) => (
          <article className="rounded-lg border border-primary/15 bg-background/45 p-4" key={planet.name}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{planet.name}</h3>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
                {planet.role}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{planet.summary}</p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
