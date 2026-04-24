"use client";

import { useMemo, useState } from "react";

import { ChartStyleToggle, type ChartStyle } from "@/components/charts/ChartStyleToggle";
import { ChartTable } from "@/components/charts/ChartTable";
import { DepthToggle } from "@/components/charts/DepthToggle";
import { HouseDrawer } from "@/components/charts/HouseDrawer";
import { NorthIndianChart } from "@/components/charts/NorthIndianChart";
import { PlanetDrawer } from "@/components/charts/PlanetDrawer";
import { SouthIndianChart } from "@/components/charts/SouthIndianChart";
import { Card, CardContent } from "@/components/ui/card";
import { chartTitle } from "@/lib/charts/catalog";
import { renderChart, type RenderedHouse, type RenderedPlanet } from "@/lib/charts/renderChart";
import type { ChartSnapshot, DepthMode } from "@/lib/schemas";

export function ChartView({
  snapshot,
  chartKey,
  defaultStyle = "north",
  showControls = true,
}: {
  snapshot: ChartSnapshot;
  chartKey: string;
  defaultStyle?: ChartStyle;
  showControls?: boolean;
}) {
  const [style, setStyle] = useState<ChartStyle>(defaultStyle);
  const [depth, setDepth] = useState<DepthMode>("simple");
  const [selectedPlanet, setSelectedPlanet] = useState<RenderedPlanet | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<RenderedHouse | null>(null);
  const rendered = useMemo(() => renderChart(snapshot, chartKey, style), [snapshot, chartKey, style]);

  if (!rendered) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Unsupported chart key.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showControls ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase text-primary">{rendered.chart.chart_key}</p>
            <h2 className="mt-1 text-2xl font-semibold">{chartTitle(rendered.chart.chart_key)}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ChartStyleToggle onChange={setStyle} value={style} />
            <DepthToggle onChange={setDepth} value={depth} />
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[620px]">
        {style === "north" ? (
          <NorthIndianChart depth={depth} onHouseSelect={setSelectedHouse} onPlanetSelect={setSelectedPlanet} rendered={rendered} />
        ) : (
          <SouthIndianChart depth={depth} onHouseSelect={setSelectedHouse} onPlanetSelect={setSelectedPlanet} rendered={rendered} />
        )}
        <ChartTable depth={depth} rendered={rendered} />
      </div>

      <PlanetDrawer aspects={snapshot.aspects} onClose={() => setSelectedPlanet(null)} planet={selectedPlanet} yogas={snapshot.yogas} />
      <HouseDrawer aspects={snapshot.aspects} house={selectedHouse} onClose={() => setSelectedHouse(null)} rendered={rendered} />
    </div>
  );
}
