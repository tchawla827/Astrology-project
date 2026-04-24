"use client";

import { useState } from "react";

import { chartSupportsNatalTechnicalDetails } from "@/lib/charts/renderChart";
import type { RenderedChart } from "@/lib/charts/renderChart";
import type { DepthMode } from "@/lib/schemas";

export function ChartTable({ rendered, depth }: { rendered: RenderedChart; depth: DepthMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const supportsTechnicalDetails = chartSupportsNatalTechnicalDetails(rendered.chart.chart_key);

  return (
    <div className="mt-4">
      <button className="text-sm text-primary hover:underline" onClick={() => setIsOpen((current) => !current)} type="button">
        {isOpen ? "Hide table" : "View as table"}
      </button>
      <div className={isOpen ? "mt-3 overflow-x-auto" : "sr-only"}>
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <caption className="sr-only">{rendered.chart.chart_key} chart placements</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-2">House</th>
              <th className="p-2">Sign</th>
              <th className="p-2">Lord</th>
              <th className="p-2">Planets</th>
              {depth === "technical" ? <th className="p-2">Technical detail</th> : null}
            </tr>
          </thead>
          <tbody>
            {rendered.houses.map((house) => {
              const planets = rendered.planets.filter((planet) => planet.house === house.house);
              return (
                <tr className="border-b border-border/60" key={house.house}>
                  <td className="p-2">{house.house}</td>
                  <td className="p-2">{house.sign}</td>
                  <td className="p-2">{house.lord}</td>
                  <td className="p-2">{planets.map((planet) => planet.label).join(", ") || "None"}</td>
                  {depth === "technical" ? (
                    <td className="p-2 text-muted-foreground">
                      {planets
                        .map((planet) =>
                          planet.technicalDetails
                            ? `${planet.planet}: ${planet.technicalDetails.longitude_deg.toFixed(2)} deg, ${planet.technicalDetails.nakshatra} pada ${planet.technicalDetails.pada}, ${planet.technicalDetails.dignity}`
                            : planet.planet,
                        )
                        .join("; ") || (supportsTechnicalDetails ? "No planet detail" : "Technical detail is not stored for this chart")}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
