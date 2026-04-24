import { StrengthBadge } from "@/components/life-areas/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HouseBreakdown({
  houses,
}: {
  houses: Array<{ number: number; sign: string; strength: "high" | "medium" | "low"; summary: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">House breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {houses.map((house) => (
          <article className="rounded-lg border p-4" key={house.number}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{house.number}th house</h3>
                <p className="text-sm text-muted-foreground">{house.sign}</p>
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
