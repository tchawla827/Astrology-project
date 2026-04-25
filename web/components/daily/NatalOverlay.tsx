import type { PlanetPlacement, TransitOverlay } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const houses = Array.from({ length: 12 }, (_, index) => index + 1);

export function NatalOverlay({
  positions,
  overlay,
}: {
  positions: PlanetPlacement[];
  overlay: TransitOverlay | null | undefined;
}) {
  const byHouse = houses.map((house) => ({
    house,
    planets: positions.filter((position) => position.house === house).map((position) => position.planet),
  }));
  const triggered = new Set(overlay?.triggered_houses ?? []);

  return (
    <div className="rounded-lg border bg-background p-4">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">Natal overlay</h2>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {byHouse.map((entry) => (
          <div
            className={cn(
              "min-h-20 rounded-md border p-2 text-xs",
              triggered.has(entry.house) ? "border-primary bg-primary/10" : "bg-card",
            )}
            key={entry.house}
          >
            <div className="font-semibold">House {entry.house}</div>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
              {entry.planets.length > 0 ? (
                entry.planets.map((planet) => (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive" key={planet}>
                    {planet}
                  </span>
                ))
              ) : (
                <span>Transit clear</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
