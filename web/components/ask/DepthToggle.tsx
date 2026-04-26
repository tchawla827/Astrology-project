"use client";

import React from "react";

import type { DepthMode } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const depthOptions: Array<{ value: DepthMode; label: string; title: string }> = [
  { value: "simple", label: "Simple", title: "Concise advice with a short chart-grounded why." },
  { value: "technical", label: "Technical", title: "Adds cited factor names and more explicit chart language." },
];

export function DepthToggle({
  value,
  onChange,
  disabled,
}: {
  value: DepthMode;
  onChange(value: DepthMode): void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-md border border-primary/20 bg-background/70 p-1" role="group" aria-label="Depth">
      {depthOptions.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            "min-h-10 cursor-pointer rounded-sm px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            value === option.value && "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground",
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
