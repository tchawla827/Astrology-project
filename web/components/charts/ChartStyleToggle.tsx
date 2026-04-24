"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type ChartStyle = "north" | "south";

export function ChartStyleToggle({ value, onChange }: { value: ChartStyle; onChange: (value: ChartStyle) => void }) {
  return (
    <ToggleGroup aria-label="Chart style">
      {(["north", "south"] as const).map((style) => (
        <ToggleGroupItem
          aria-pressed={value === style}
          className={cn(value === style && "bg-primary text-primary-foreground")}
          key={style}
          onClick={() => onChange(style)}
          type="button"
        >
          {style === "north" ? "North" : "South"}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
