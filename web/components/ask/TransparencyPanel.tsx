"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { BirthTimeSensitivityNote } from "@/components/ask/BirthTimeSensitivityNote";
import { FactorChip } from "@/components/ask/FactorChip";
import { MiniChartThumbnail } from "@/components/ask/MiniChartThumbnail";
import type { TransparencyViewModel } from "@/lib/ask/transparency";
import type { AskAnswer, LlmMetadata } from "@/lib/schemas";

type Props = {
  answer: AskAnswer;
  metadata?: LlmMetadata;
  messageId?: string;
};

function fallbackModel(answer: AskAnswer, metadata?: LlmMetadata): TransparencyViewModel {
  return {
    answer_basis: answer.technical_basis,
    charts: answer.technical_basis.charts_used.map((key) => ({
      key,
      href: `/charts/${key}`,
      available: false,
    })),
    houses: answer.technical_basis.houses_used.map((house) => ({
      house,
      label: `${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} house`,
      summary: "Open a stored session to load the full bundle summary for this house.",
    })),
    planets: answer.technical_basis.planets_used.map((planet) => ({
      planet,
      role: "Cited factor",
      summary: "Open a stored session to load the full bundle summary for this planet.",
    })),
    timing: { current: answer.timing.summary, transit_notes: [] },
    provider: {
      provider: metadata?.provider ?? "gemini",
      model: metadata?.model ?? "unknown",
      prompt_version: metadata?.prompt_version ?? "unknown",
    },
    bundle_outdated: false,
  };
}

export function TransparencyPanel({ answer, metadata, messageId }: Props) {
  const [model, setModel] = useState<TransparencyViewModel>(() => fallbackModel(answer, metadata));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!messageId || messageId.startsWith("assistant-")) {
      return;
    }

    let cancelled = false;
    void fetch(`/api/ask/messages/${messageId}/transparency`)
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          transparency?: TransparencyViewModel;
          error?: string;
        };
        if (!response.ok || !body.transparency) {
          throw new Error(body.error ?? "Could not load reasoning details.");
        }
        if (!cancelled) {
          setModel(body.transparency);
          setError(null);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Could not load reasoning details.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  return (
    <details className="group rounded-md border bg-muted/30 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
        Show reasoning
        <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Based on charts</p>
          <div className="flex flex-wrap gap-2">
            {model.charts.map((chart) => (
              <FactorChip href={chart.available ? chart.href : undefined} key={chart.key} title={chart.available ? `Open ${chart.key}` : `${chart.key} is not available in this snapshot`}>
                <span className="flex items-center gap-2">
                  <MiniChartThumbnail chart={chart.chart} />
                  {chart.key}
                </span>
              </FactorChip>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Houses</p>
            <div className="flex flex-wrap gap-2">
              {model.houses.map((house) => (
                <FactorChip key={house.house} title={house.summary}>
                  {house.house}: {house.strength ?? "cited"}
                </FactorChip>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Planets</p>
            <div className="space-y-2">
              {model.planets.map((planet) => (
                <div className="rounded-md border bg-background/70 p-2 text-xs leading-5" key={planet.planet}>
                  <span className="font-mono text-foreground">{planet.planet}</span>
                  <span className="text-muted-foreground"> - {planet.role}: {planet.summary}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Timing</p>
          <p className="text-xs text-muted-foreground">Current: {model.timing.current}</p>
          {model.timing.transit_notes.map((note) => (
            <p className="text-xs text-muted-foreground" key={note}>Transit: {note}</p>
          ))}
        </section>

        {model.birth_time_sensitivity ? <BirthTimeSensitivityNote {...model.birth_time_sensitivity} /> : null}

        {model.bundle_outdated ? (
          <p className="rounded-md border bg-background/70 p-2 text-xs text-muted-foreground">
            This analysis is based on an older bundle. Recompute the profile to refresh it.
          </p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          {model.provider.provider} - {model.provider.model} - {model.provider.prompt_version}
        </p>
      </div>
    </details>
  );
}
