"use client";

import React from "react";

import type { ToneMode } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const toneOptions: Array<{ value: ToneMode; label: string; title: string }> = [
  { value: "balanced", label: "Balanced", title: "Measured and supportive, without softening the chart." },
  { value: "direct", label: "Direct", title: "Plain-spoken and practical, with minimal hedging." },
  { value: "brutal", label: "Brutal", title: "Blunt, grounded in the chart. Not cruel for its own sake." },
];

export function ToneSelector({
  value,
  onChange,
  disabled,
}: {
  value: ToneMode;
  onChange(value: ToneMode): void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-md border border-primary/20 bg-background/70 p-1" role="group" aria-label="Tone">
      {toneOptions.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            "min-h-10 cursor-pointer rounded-sm px-3 text-xs font-medium capitalize text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            value === option.value && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )}
          disabled={disabled}
          key={option.value}
          onClick={() => onChange(option.value)}
          title={option.title}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
