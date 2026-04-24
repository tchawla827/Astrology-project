"use client";

import { useState } from "react";

import { ChartView } from "@/components/charts/ChartView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_LABELS, SUPPORTED_CHART_KEYS, type SupportedChartKey } from "@/lib/charts/catalog";
import type { ChartSnapshot } from "@/lib/schemas";

export function ChartSwitcher({ snapshot }: { snapshot: ChartSnapshot }) {
  const available = SUPPORTED_CHART_KEYS.filter((key) => snapshot.charts[key]);
  const initialLeft: SupportedChartKey = available.includes("D1") ? "D1" : available[0] ?? "D1";
  const initialRight: SupportedChartKey = available.includes("D9") ? "D9" : available[1] ?? initialLeft;
  const [left, setLeft] = useState<SupportedChartKey>(initialLeft);
  const [right, setRight] = useState<SupportedChartKey>(initialRight);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ChartSelect label="Left chart" onChange={setLeft} options={available} value={left} />
        <ChartSelect label="Right chart" onChange={setRight} options={available} value={right} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{left} {CHART_LABELS[left]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartView chartKey={left} defaultStyle="north" showControls={false} snapshot={snapshot} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{right} {CHART_LABELS[right]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartView chartKey={right} defaultStyle="north" showControls={false} snapshot={snapshot} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: SupportedChartKey;
  options: SupportedChartKey[];
  onChange: (value: SupportedChartKey) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="h-10 rounded-md border bg-background px-3"
        onChange={(event) => onChange(event.target.value as SupportedChartKey)}
        value={value}
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {key} {CHART_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
