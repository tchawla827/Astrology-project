import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Yoga } from "@/lib/schemas";

export function YogaList({ yogas }: { yogas: Yoga[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Yogas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {yogas.length > 0 ? (
          <ul className="space-y-3">
            {yogas.map((yoga) => (
              <li className="rounded-md border bg-background/40 p-3 text-sm" key={`${yoga.name}:${yoga.notes.join("|")}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{yoga.name}</p>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs uppercase text-muted-foreground">{yoga.confidence}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{yoga.source_charts.join(", ")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {yoga.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
            No yogas were flagged in this snapshot.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
