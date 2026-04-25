"use client";

import React from "react";

import type { DepthMode, ToneMode } from "@/lib/schemas";

const baseSuggestions = ["Ask about timing", "Ask about long-term pattern"];

export function FollowUpSuggestions({
  tone,
  depth,
  onSelect,
}: {
  tone: ToneMode;
  depth: DepthMode;
  onSelect(question: string): void;
}) {
  const modeSuggestion = depth === "simple" ? "Explain this technically" : tone === "brutal" ? "Give me the direct version" : "Give me the brutal version";
  const suggestions = [...baseSuggestions, modeSuggestion];

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          type="button"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
