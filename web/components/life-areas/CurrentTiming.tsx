import { CalendarClock, Orbit } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CurrentTiming({
  timing,
}: {
  timing: { mahadasha: string; antardasha: string; notes: string[] };
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Timing weather</p>
        </div>
        <CardTitle className="text-2xl">Current timing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mahadasha</p>
            <p className="mt-2 text-xl font-semibold">{timing.mahadasha}</p>
          </div>
          <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Antardasha</p>
            <p className="mt-2 text-xl font-semibold">{timing.antardasha}</p>
          </div>
        </div>
        {timing.notes.length > 0 ? (
          <ul className="space-y-3">
            {timing.notes.map((note) => (
              <li className="flex gap-3 rounded-lg border border-primary/15 bg-background/45 p-4" key={note}>
                <Orbit className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm leading-6 text-muted-foreground">{note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No direct transit notes are active for this topic right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
