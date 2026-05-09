import { AlertTriangle, BadgeCheck, Braces, Clock3, Compass, Scale, Sparkles } from "lucide-react";

import { strengthBadgeClass } from "@/components/life-areas/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { topicTitles } from "@/lib/derived/shared";
import type { TopicEvidence, TopicEvidenceFactor, TopicEvidenceTimingFactor } from "@/lib/schemas";

function factorKey(factor: TopicEvidenceFactor | TopicEvidenceTimingFactor) {
  return `${factor.label}:${factor.summary}`;
}

function CitationLine({ factor }: { factor: TopicEvidenceFactor | TopicEvidenceTimingFactor }) {
  const parts = [
    factor.citations.charts.length > 0 ? `Charts: ${factor.citations.charts.join(", ")}` : "",
    factor.citations.houses.length > 0 ? `Houses: ${factor.citations.houses.join(", ")}` : "",
    factor.citations.planets.length > 0 ? `Planets: ${factor.citations.planets.join(", ")}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">{parts.join(" | ")}</p>
  ) : null;
}

function FactorList({
  factors,
  empty,
}: {
  factors: Array<TopicEvidenceFactor | TopicEvidenceTimingFactor>;
  empty: string;
}) {
  if (factors.length === 0) {
    return <p className="text-sm leading-6 text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {factors.map((factor) => (
        <article className="rounded-lg border border-primary/15 bg-background/45 p-4" key={factorKey(factor)}>
          <h3 className="text-sm font-semibold">{factor.label}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{factor.summary}</p>
          <CitationLine factor={factor} />
        </article>
      ))}
    </div>
  );
}

export function TopicEvidencePanel({ evidence }: { evidence: TopicEvidence }) {
  const topicTitle = topicTitles[evidence.topic];
  const topicLower = topicTitle.toLowerCase();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            label: "Whole-life pattern",
            title: `What ${topicLower} is built around`,
            body: evidence.overview.lifelong_pattern,
            icon: Compass,
          },
          {
            label: "Current phase",
            title: "What is happening now",
            body: evidence.overview.current_phase,
            icon: Clock3,
          },
          {
            label: "Practical focus",
            title: "What to do with it",
            body: evidence.overview.practical_focus,
            icon: Scale,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="border-primary/25 bg-card/75" key={item.label}>
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-3 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <p className="text-xs uppercase tracking-[0.18em]">{item.label}</p>
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="border-primary/25 bg-card/75">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <Scale className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.18em]">Verdict basis</p>
          </div>
          <CardTitle className="text-2xl">Chart basis for the {topicLower} read</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <FactorList factors={evidence.primary_factors} empty="No primary evidence is available for this topic yet." />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.18em]">Support</p>
            </div>
            <CardTitle className="text-2xl">Supports {topicLower}</CardTitle>
          </CardHeader>
          <CardContent>
            <FactorList factors={evidence.supporting_factors} empty="No strong support factor is isolated yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.18em]">Friction</p>
            </div>
            <CardTitle className="text-2xl">Creates delay or friction</CardTitle>
          </CardHeader>
          <CardContent>
            <FactorList factors={evidence.friction_factors} empty="No major friction factor is isolated yet." />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.18em]">Timing evidence</p>
          </div>
          <CardTitle className="text-2xl">Current timing</CardTitle>
        </CardHeader>
        <CardContent>
          <FactorList factors={evidence.timing_factors} empty="No timing evidence is available yet." />
        </CardContent>
      </Card>

      <details className="rounded-lg border border-primary/20 bg-card/70 p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <span className="flex items-center gap-3 text-sm font-semibold">
            <Braces className="h-5 w-5 text-primary" aria-hidden="true" />
            Technical evidence
          </span>
          <Badge className={strengthBadgeClass(evidence.confidence.level)}>{evidence.confidence.level}</Badge>
        </summary>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Confidence</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {evidence.confidence.reasons.map((reason) => (
                <li className="text-sm leading-6 text-muted-foreground" key={reason}>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
            <h3 className="text-sm font-semibold">Birth-time sensitivity</h3>
            <Badge className={strengthBadgeClass(evidence.birth_time_sensitivity.level)}>
              {evidence.birth_time_sensitivity.level}
            </Badge>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{evidence.birth_time_sensitivity.note}</p>
          </div>
          <div className="rounded-lg border border-primary/15 bg-background/45 p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold">Allowed citations</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Charts: {evidence.citations.charts.join(", ") || "none"} | Houses:{" "}
              {evidence.citations.houses.join(", ") || "none"} | Planets:{" "}
              {evidence.citations.planets.join(", ") || "none"}
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
