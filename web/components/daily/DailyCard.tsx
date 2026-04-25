import { AlertTriangle } from "lucide-react";

import { DatePicker } from "@/components/daily/DatePicker";
import { NatalOverlay } from "@/components/daily/NatalOverlay";
import { TransitHighlights } from "@/components/daily/TransitHighlights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPrediction, ToneMode, TransitSummary } from "@/lib/schemas";
import type { TransitRuleHit } from "@/lib/server/generateDailyPrediction";

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">{title}</h2>
      {items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No strong signal in this lane for the selected date.</p>
      )}
    </section>
  );
}

export function DailyCard({
  prediction,
  transits,
  transitRules,
  tone,
  todayDate,
  minDate,
  maxDate,
  showBirthTimeSensitivity,
  cacheLabel,
}: {
  prediction: DailyPrediction;
  transits: TransitSummary;
  transitRules: TransitRuleHit[];
  tone: ToneMode;
  todayDate: string;
  minDate: string;
  maxDate: string;
  showBirthTimeSensitivity: boolean;
  cacheLabel: string;
}) {
  return (
    <div className="space-y-4">
      <DatePicker date={prediction.date} max={maxDate} min={minDate} todayDate={todayDate} tone={tone} />

      {showBirthTimeSensitivity ? (
        <div className="flex gap-3 rounded-lg border border-primary/35 bg-primary/10 p-4 text-sm text-primary">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p>Triggered angular houses rely on Lagna, and this profile does not have exact birth time confidence.</p>
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm uppercase text-primary">{prediction.date}</p>
            <p className="text-xs text-muted-foreground">{cacheLabel}</p>
          </div>
          <CardTitle className="text-2xl leading-snug">{prediction.verdict}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ListSection items={prediction.favorable} title="Favorable" />
            <ListSection items={prediction.caution} title="Caution" />
          </div>
          <NatalOverlay overlay={transits.overlay} positions={transits.positions} />
          <TransitHighlights hits={transitRules} />
          <section className="rounded-lg border bg-background p-4">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Transparency</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Triggered houses</dt>
                <dd>{prediction.technical_basis.triggered_houses.join(", ") || "None"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Planets</dt>
                <dd>{prediction.technical_basis.planets_used.join(", ") || "None"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rules</dt>
                <dd>{prediction.technical_basis.transit_rules.join(", ") || "None"}</dd>
              </div>
            </dl>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
