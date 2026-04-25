import React from "react";

import type { Chart } from "@/lib/schemas";

const HOUSE_POINTS: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 18 },
  2: { x: 28, y: 28 },
  3: { x: 18, y: 50 },
  4: { x: 28, y: 72 },
  5: { x: 50, y: 82 },
  6: { x: 72, y: 72 },
  7: { x: 82, y: 50 },
  8: { x: 72, y: 28 },
  9: { x: 50, y: 40 },
  10: { x: 40, y: 50 },
  11: { x: 50, y: 60 },
  12: { x: 60, y: 50 },
};

const ABBREVIATIONS: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

export function MiniChartThumbnail({ chart }: { chart?: Chart }) {
  return (
    <svg aria-hidden="true" className="h-10 w-10 shrink-0 rounded border bg-card" viewBox="0 0 100 100">
      <rect className="fill-card stroke-border" height="98" rx="1.5" width="98" x="1" y="1" />
      <path className="fill-none stroke-border" d="M50 2 L98 50 L50 98 L2 50 Z M2 2 L98 98 M98 2 L2 98 M50 2 L2 50 L50 98 L98 50 Z" />
      {chart?.planets.slice(0, 5).map((planet, index) => {
        const point = HOUSE_POINTS[planet.house] ?? { x: 50, y: 50 };
        const offset = (index % 2) * 4;
        return (
          <text
            className="fill-primary text-[6px] font-semibold"
            key={`${planet.planet}-${index}`}
            textAnchor="middle"
            x={point.x + offset}
            y={point.y + 6}
          >
            {ABBREVIATIONS[planet.planet] ?? planet.planet.slice(0, 2)}
          </text>
        );
      })}
    </svg>
  );
}
