import React from "react";
import { ChevronDown, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AskAnswer } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function confidenceClass(level: AskAnswer["confidence"]["level"]) {
  switch (level) {
    case "high":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "low":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  }
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li className="flex gap-2 text-sm leading-6 text-muted-foreground" key={item}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnswerCard({ answer, className }: { answer: AskAnswer; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Verdict</p>
            <CardTitle className="text-xl leading-7">{answer.verdict}</CardTitle>
          </div>
          <Button disabled size="sm" title="Coming next" type="button" variant="outline">
            <Share2 aria-hidden="true" className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Why</h3>
          <BulletList items={answer.why} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Timing</h3>
          <p className="text-sm leading-6 text-muted-foreground">{answer.timing.summary}</p>
          <div className="flex flex-wrap gap-2">
            {answer.timing.type.map((type) => (
              <Badge className="capitalize text-muted-foreground" key={type}>
                {type}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Confidence</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("capitalize", confidenceClass(answer.confidence.level))}>
              {answer.confidence.level}
            </Badge>
            <span className="text-sm text-muted-foreground">{answer.confidence.note}</span>
          </div>
        </section>

        {answer.advice.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">What to do</h3>
            <BulletList items={answer.advice} />
          </section>
        ) : null}

        <details className="group rounded-md border bg-background/60 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
            Show reasoning
            <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
            <div>
              <span className="font-medium text-foreground">Charts</span>
              <p>{answer.technical_basis.charts_used.join(", ")}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Houses</span>
              <p>{answer.technical_basis.houses_used.join(", ")}</p>
            </div>
            <div>
              <span className="font-medium text-foreground">Planets</span>
              <p>{answer.technical_basis.planets_used.join(", ")}</p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
