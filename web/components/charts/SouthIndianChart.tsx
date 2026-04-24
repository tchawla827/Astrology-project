"use client";

import * as React from "react";

import type { DepthMode } from "@/lib/schemas";
import type { RenderedChart, RenderedHouse, RenderedPlanet } from "@/lib/charts/renderChart";

type Props = {
  rendered: RenderedChart;
  depth: DepthMode;
  onPlanetSelect?: (planet: RenderedPlanet) => void;
  onHouseSelect?: (house: RenderedHouse) => void;
};

export function SouthIndianChart({ rendered, depth, onPlanetSelect, onHouseSelect }: Props) {
  return (
    <svg aria-label={`${rendered.chart.chart_key} South Indian chart`} className="h-auto w-full" role="img" viewBox="0 0 100 100">
      <rect className="fill-card stroke-border" height="98" rx="1.5" width="98" x="1" y="1" />
      {[25, 50, 75].map((value) => (
        <g key={value}>
          <line className="stroke-border" x1={value} x2={value} y1="1" y2="99" />
          <line className="stroke-border" x1="1" x2="99" y1={value} y2={value} />
        </g>
      ))}
      {rendered.houses.map((house) => (
        <g key={house.house}>
          <g
            aria-label={`${house.sign}, house ${house.house}`}
            className="cursor-pointer"
            onClick={() => onHouseSelect?.(house)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onHouseSelect?.(house);
            }}
            role="button"
            tabIndex={0}
          >
            <rect className="fill-transparent hover:fill-muted/40" height="21" width="21" x={house.point.x - 10.5} y={house.point.y - 10.5} />
          </g>
          <text className="fill-foreground text-[3.3px]" textAnchor="middle" x={house.point.x} y={house.point.y - 5.2}>
            {house.sign.slice(0, 3)}
          </text>
          <text className="fill-muted-foreground text-[3px]" textAnchor="middle" x={house.point.x} y={house.point.y - 1.5}>
            H{house.house}
          </text>
          {depth === "technical" ? (
            <text className="fill-muted-foreground text-[2.4px]" textAnchor="middle" x={house.point.x} y={house.point.y + 2}>
              {house.lord.slice(0, 2)}
            </text>
          ) : null}
        </g>
      ))}
      {rendered.planets.map((planet) => (
        <g key={planet.planet}>
          <g
            aria-label={`${planet.planet} in ${planet.sign}, house ${planet.house}`}
            className="cursor-pointer"
            onClick={() => onPlanetSelect?.(planet)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onPlanetSelect?.(planet);
            }}
            role="button"
            tabIndex={0}
          >
            <circle className="fill-primary/15 stroke-primary hover:fill-primary/30" cx={planet.point.x} cy={planet.point.y + 5.1} r="3.8" />
          </g>
          <text className="pointer-events-none fill-primary text-[2.8px] font-semibold" textAnchor="middle" x={planet.point.x} y={planet.point.y + 6}>
            {planet.label}
          </text>
          {planet.technicalDetails?.combust ? <circle className="fill-destructive" cx={planet.point.x + 4.2} cy={planet.point.y + 2.2} r="1" /> : null}
          {depth === "technical" && planet.technicalDetails ? (
            <text className="pointer-events-none fill-muted-foreground text-[2px]" textAnchor="middle" x={planet.point.x} y={planet.point.y + 9.6}>
              {planet.technicalDetails.longitude_deg.toFixed(1)} {planet.technicalDetails.nakshatra.slice(0, 3)}-{planet.technicalDetails.pada}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
