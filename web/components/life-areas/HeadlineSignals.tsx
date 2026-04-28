import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HeadlineSignals({ signals }: { signals: string[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Report signals</p>
        </div>
        <CardTitle className="text-2xl">Headline signals</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 md:grid-cols-2">
          {signals.map((signal, index) => (
            <li className="rounded-lg border border-primary/15 bg-background/45 p-4" key={`${index}-${signal}`}>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-muted-foreground">{signal}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
