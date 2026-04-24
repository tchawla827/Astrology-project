import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlanetBreakdown({
  planets,
}: {
  planets: Array<{ name: string; role: string; summary: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Planet breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {planets.map((planet) => (
          <article className="rounded-lg border p-4" key={planet.name}>
            <h3 className="text-base font-semibold">
              {planet.name} <span className="font-normal text-muted-foreground">- {planet.role}</span>
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{planet.summary}</p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
