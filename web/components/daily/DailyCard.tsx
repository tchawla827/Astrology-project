import { AlertTriangle, Brain, BriefcaseBusiness, CalendarDays, CheckCircle2, Heart, ShieldAlert, Sparkles, Target } from "lucide-react";

import { DatePicker } from "@/components/daily/DatePicker";
import { NatalOverlay } from "@/components/daily/NatalOverlay";
import { TransitHighlights } from "@/components/daily/TransitHighlights";
import { TransitFactsExportButton } from "@/components/daily/TransitFactsExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyPrediction, ToneMode, TransitSummary } from "@/lib/schemas";
import type { TransitRuleHit } from "@/lib/server/generateDailyPrediction";

function ListSection({ title, items, mode }: { title: string; items: string[]; mode: "favorable" | "caution" }) {
  const Icon = mode === "favorable" ? CheckCircle2 : ShieldAlert;
  return (
    <section className="rounded-lg border border-primary/15 bg-background/45 p-4">
      <div className="flex items-center gap-2">
        <Icon className={mode === "favorable" ? "h-4 w-4 text-emerald-300" : "h-4 w-4 text-accent"} aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      </div>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <li className="flex gap-3 leading-6" key={item}>
              <span className={mode === "favorable" ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No strong signal in this lane for the selected date.</p>
      )}
    </section>
  );
}

const aspectCopy = {
  love: { label: "Love", Icon: Heart, bar: "bg-rose-300" },
  emotional: { label: "Emotional", Icon: Brain, bar: "bg-sky-300" },
  career: { label: "Career", Icon: BriefcaseBusiness, bar: "bg-amber-300" },
  focus: { label: "Focus", Icon: Target, bar: "bg-emerald-300" },
} satisfies Record<DailyPrediction["aspect_scores"][number]["aspect"], { label: string; Icon: typeof Heart; bar: string }>;

function AspectScoreGrid({ scores }: { scores: DailyPrediction["aspect_scores"] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {scores.map((score) => {
        const { label, Icon, bar } = aspectCopy[score.aspect];
        return (
          <div className="rounded-lg border border-primary/15 bg-background/45 p-4" key={score.aspect}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <h2 className="text-sm font-semibold">{label}</h2>
              </div>
              <div className="rounded-md border border-primary/20 bg-card/70 px-2 py-1 text-sm font-semibold">
                {score.score}/100
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className={`h-2 rounded-full ${bar}`} style={{ width: `${score.score}%` }} />
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{score.label}</p>
            <p className="mt-2 text-sm leading-6">{score.sentence}</p>
          </div>
        );
      })}
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
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <DatePicker date={prediction.date} max={maxDate} min={minDate} todayDate={todayDate} tone={tone} />
        <TransitFactsExportButton date={prediction.date} />
      </div>

      {showBirthTimeSensitivity ? (
        <div className="flex gap-3 rounded-lg border border-primary/35 bg-primary/10 p-4 text-sm text-primary">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p>Triggered angular houses rely on Lagna, and this profile does not have exact birth time confidence.</p>
        </div>
      ) : null}

      <Card className="overflow-hidden border-primary/20 bg-card/70">
        <CardHeader className="cosmic-surface relative gap-4 p-6 sm:p-8">
          <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3 text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                <p className="text-sm uppercase tracking-[0.22em]">{prediction.date}</p>
              </div>
              <CardTitle className="mt-5 max-w-4xl font-display text-4xl leading-tight sm:text-5xl">
                {prediction.verdict}
              </CardTitle>
            </div>
            <div className="rounded-md border border-primary/25 bg-background/60 px-3 py-2 text-xs capitalize text-primary">
              {tone} tone
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="luxury-panel rounded-lg p-5">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Daily scores</h2>
            </div>
            <p className="mt-3 text-lg font-medium leading-7">{prediction.felt_sense}</p>
            <div className="mt-5">
              <AspectScoreGrid scores={prediction.aspect_scores} />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ListSection items={prediction.favorable} mode="favorable" title="Favorable periods" />
              <ListSection items={prediction.caution} mode="caution" title="Caution periods" />
            </div>
          </div>

          <NatalOverlay overlay={transits.overlay} positions={transits.positions} />
          <TransitHighlights hits={transitRules} />
          <section className="rounded-lg border border-primary/15 bg-background/45 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Transparency</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-primary/10 bg-card/70 p-3">
                <dt className="text-muted-foreground">Triggered houses</dt>
                <dd className="mt-1 font-medium">{prediction.technical_basis.triggered_houses.join(", ") || "None"}</dd>
              </div>
              <div className="rounded-md border border-primary/10 bg-card/70 p-3">
                <dt className="text-muted-foreground">Planets</dt>
                <dd className="mt-1 font-medium">{prediction.technical_basis.planets_used.join(", ") || "None"}</dd>
              </div>
              <div className="rounded-md border border-primary/10 bg-card/70 p-3">
                <dt className="text-muted-foreground">Rules</dt>
                <dd className="mt-1 font-medium">{prediction.technical_basis.transit_rules.join(", ") || "None"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">{cacheLabel}</p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
