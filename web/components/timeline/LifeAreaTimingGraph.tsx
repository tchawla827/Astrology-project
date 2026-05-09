import { Activity, AlertTriangle, BadgeCheck, Gauge } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { topicTitles } from "@/lib/derived/shared";
import type { LifeAreaTimingPoint, LifeAreaTimingSeries } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const metricStyles = {
  support: { label: "Support", color: "#34d399", icon: BadgeCheck },
  pressure: { label: "Pressure", color: "#fb7185", icon: AlertTriangle },
  volatility: { label: "Volatility", color: "#fbbf24", icon: Activity },
  confidence: { label: "Confidence", color: "#38bdf8", icon: Gauge },
} as const;

function metricPoints(points: LifeAreaTimingPoint[], metric: keyof typeof metricStyles) {
  const width = 720;
  const height = 260;
  const left = 42;
  const right = 18;
  const top = 20;
  const bottom = 34;
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;

  return points
    .map((point, index) => {
      const x = left + (usableWidth / Math.max(1, points.length - 1)) * index;
      const y = top + usableHeight - (point[metric] / 100) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function phaseClass(phase: LifeAreaTimingPoint["phase"]) {
  switch (phase) {
    case "supported":
      return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
    case "pressured":
      return "border-rose-400/35 bg-rose-500/10 text-rose-200";
    case "volatile":
      return "border-amber-400/35 bg-amber-500/10 text-amber-200";
    case "low_confidence":
      return "border-sky-400/35 bg-sky-500/10 text-sky-200";
    case "mixed":
      return "border-primary/30 bg-primary/10 text-primary";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function FactorSummary({ point }: { point: LifeAreaTimingPoint }) {
  const factor = point.top_factors[0];
  return (
    <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-md border px-2 py-1 text-xs capitalize", phaseClass(point.phase))}>
          {point.phase.replace("_", " ")}
        </span>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{point.date}</p>
      </div>
      <p className="mt-3 text-sm font-semibold">{factor?.label ?? "No dominant factor"}</p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {factor?.summary ?? "This point is mainly balanced across natal, dasha, transit, and confidence inputs."}
      </p>
    </div>
  );
}

export function LifeAreaTimingGraph({
  series,
  selectedMonth,
}: {
  series: LifeAreaTimingSeries;
  selectedMonth: number;
}) {
  const selectedPoint = series.monthly[selectedMonth - 1] ?? series.monthly[0];

  return (
    <Card className="border-primary/25 bg-card/80">
      <CardHeader className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Deterministic timing graph</p>
          <CardTitle className="mt-2 text-3xl">{topicTitles[series.topic]} through {series.year}</CardTitle>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(metricStyles).map(([metric, style]) => {
            const Icon = style.icon;
            const value = selectedPoint?.[metric as keyof typeof metricStyles] ?? 0;
            return (
              <div className="rounded-lg border border-primary/15 bg-background/45 p-4" key={metric}>
                <div className="flex items-center gap-2" style={{ color: style.color }}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <p className="text-xs uppercase tracking-[0.16em]">{style.label}</p>
                </div>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto">
          <svg aria-label={`${topicTitles[series.topic]} timing graph`} className="min-h-[18rem] min-w-[48rem] w-full" viewBox="0 0 720 260" role="img">
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = 20 + 206 - (tick / 100) * 206;
              return (
                <g key={tick}>
                  <line stroke="rgba(230,187,91,0.12)" x1="42" x2="702" y1={y} y2={y} />
                  <text fill="rgba(244,241,232,0.55)" fontSize="10" x="10" y={y + 4}>
                    {tick}
                  </text>
                </g>
              );
            })}
            {monthLabels.map((label, index) => {
              const x = 42 + (660 / 11) * index;
              return (
                <text fill="rgba(244,241,232,0.58)" fontSize="10" key={label} textAnchor="middle" x={x} y="250">
                  {label}
                </text>
              );
            })}
            {Object.entries(metricStyles).map(([metric, style]) => (
              <polyline
                fill="none"
                key={metric}
                points={metricPoints(series.monthly, metric as keyof typeof metricStyles)}
                stroke={style.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={metric === "confidence" ? 2 : 3}
              />
            ))}
            {selectedPoint ? (
              <line
                stroke="rgba(244,241,232,0.45)"
                strokeDasharray="4 6"
                x1={42 + (660 / 11) * (selectedMonth - 1)}
                x2={42 + (660 / 11) * (selectedMonth - 1)}
                y1="16"
                y2="230"
              />
            ) : null}
          </svg>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(metricStyles).map(([metric, style]) => (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" key={metric}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.color }} />
              {style.label}
            </span>
          ))}
        </div>
        {selectedPoint ? <FactorSummary point={selectedPoint} /> : null}
      </CardContent>
    </Card>
  );
}

export function TimingMonthDrilldown({ points }: { points: LifeAreaTimingPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Daily drilldown</p>
        <CardTitle className="text-2xl">{formatDate(points[0]?.date ?? "")} to {formatDate(points[points.length - 1]?.date ?? "")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-y-2 text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Support</th>
                <th className="px-3 py-2">Pressure</th>
                <th className="px-3 py-2">Volatility</th>
                <th className="px-3 py-2">Confidence</th>
                <th className="px-3 py-2">Top factor</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr className="rounded-lg bg-background/45" key={point.date}>
                  <td className="rounded-l-lg border-y border-l border-primary/10 px-3 py-3">{formatDate(point.date)}</td>
                  <td className="border-y border-primary/10 px-3 py-3 text-emerald-200">{point.support}</td>
                  <td className="border-y border-primary/10 px-3 py-3 text-rose-200">{point.pressure}</td>
                  <td className="border-y border-primary/10 px-3 py-3 text-amber-200">{point.volatility}</td>
                  <td className="border-y border-primary/10 px-3 py-3 text-sky-200">{point.confidence}</td>
                  <td className="rounded-r-lg border-y border-r border-primary/10 px-3 py-3 text-muted-foreground">
                    {point.top_factors[0]?.label ?? "Balanced inputs"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
