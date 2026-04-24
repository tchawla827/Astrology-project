"use client";

import type { DepthMode } from "@/lib/schemas";
import type { RenderedChart, RenderedHouse, RenderedPlanet } from "@/lib/charts/renderChart";

type Props = {
  rendered: RenderedChart;
  depth: DepthMode;
  onPlanetSelect?: (planet: RenderedPlanet) => void;
  onHouseSelect?: (house: RenderedHouse) => void;
};

export function NorthIndianChart({ rendered, depth, onPlanetSelect, onHouseSelect }: Props) {
  return (
    <svg aria-label={`${rendered.chart.chart_key} North Indian chart`} className="h-auto w-full" role="img" viewBox="0 0 100 100">
      <rect className="fill-card stroke-border" height="98" rx="1.5" width="98" x="1" y="1" />
      <path className="fill-none stroke-border" d="M50 2 L98 50 L50 98 L2 50 Z M2 2 L98 98 M98 2 L2 98 M50 2 L2 50 L50 98 L98 50 Z" />
      {rendered.houses.map((house) => (
        <g key={house.house}>
          <g
            aria-label={`House ${house.house}, ${house.sign}`}
            className="cursor-pointer"
            onClick={() => onHouseSelect?.(house)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onHouseSelect?.(house);
            }}
            role="button"
            tabIndex={0}
          >
            <circle className="fill-transparent hover:fill-muted/40" cx={house.point.x} cy={house.point.y} r="10" />
          </g>
          <text className="fill-muted-foreground text-[3.2px]" textAnchor="middle" x={house.point.x} y={house.point.y - 5.2}>
            {house.house}
          </text>
          <text className="fill-foreground text-[3.3px]" textAnchor="middle" x={house.point.x} y={house.point.y - 1.6}>
            {house.sign.slice(0, 3)}
          </text>
          {depth === "technical" ? (
            <text className="fill-muted-foreground text-[2.6px]" textAnchor="middle" x={house.point.x} y={house.point.y + 2}>
              lord {house.lord.slice(0, 2)}
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
            <circle className="fill-primary/15 stroke-primary hover:fill-primary/30" cx={planet.point.x} cy={planet.point.y + 5.1} r="4.2" />
          </g>
          <text className="pointer-events-none fill-primary text-[3px] font-semibold" textAnchor="middle" x={planet.point.x} y={planet.point.y + 6.1}>
            {planet.label}
          </text>
          {planet.technicalDetails?.combust ? <circle className="fill-destructive" cx={planet.point.x + 4.6} cy={planet.point.y + 2.2} r="1" /> : null}
          {depth === "technical" && planet.technicalDetails ? (
            <text className="pointer-events-none fill-muted-foreground text-[2.2px]" textAnchor="middle" x={planet.point.x} y={planet.point.y + 10}>
              {planet.technicalDetails.longitude_deg.toFixed(1)} {planet.technicalDetails.nakshatra.slice(0, 3)}-{planet.technicalDetails.pada}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
