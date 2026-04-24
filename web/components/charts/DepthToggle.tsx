"use client";

import type { DepthMode } from "@/lib/schemas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function DepthToggle({ value, onChange }: { value: DepthMode; onChange: (value: DepthMode) => void }) {
  return (
    <ToggleGroup aria-label="Chart depth">
      {(["simple", "technical"] as const).map((depth) => (
        <ToggleGroupItem
          aria-pressed={value === depth}
          className={cn(value === depth && "bg-secondary text-secondary-foreground")}
          key={depth}
          onClick={() => onChange(depth)}
          type="button"
        >
          {depth === "simple" ? "Simple" : "Technical"}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
