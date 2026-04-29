"use client";

import { useState } from "react";

import { chartHasPlanetTechnicalDetails, chartSupportsNatalTechnicalDetails } from "@/lib/charts/renderChart";
import type { RenderedChart } from "@/lib/charts/renderChart";
import type { DepthMode } from "@/lib/schemas";

export function ChartTable({ rendered, depth }: { rendered: RenderedChart; depth: DepthMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const supportsTechnicalDetails = chartSupportsNatalTechnicalDetails(rendered.chart.chart_key);
  const hasChartDetails = chartHasPlanetTechnicalDetails(rendered.chart);

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
                        .map((planet) => {
                          const longitude = planet.longitude_deg ?? planet.technicalDetails?.longitude_deg;
                          const dignity = planet.dignity ?? planet.technicalDetails?.dignity;
                          const physicalCombust = planet.combust ?? planet.technicalDetails?.combust;
                          const parts = [
                            typeof longitude === "number" ? `${longitude.toFixed(2)} deg` : null,
                            planet.technicalDetails ? `${planet.technicalDetails.nakshatra} pada ${planet.technicalDetails.pada}` : null,
                            dignity,
                            planet.retrograde ?? planet.technicalDetails?.retrograde ? "retrograde" : null,
                            physicalCombust ? "physically combust" : null,
                            planet.varga_symbolic_combust ? "symbolic Sun proximity" : null,
                          ].filter(Boolean);
                          return `${planet.planet}${parts.length > 0 ? `: ${parts.join(", ")}` : ""}`;
                        })
                        .join("; ") || (supportsTechnicalDetails || hasChartDetails ? "No planet detail" : "Technical detail is not stored for this chart")}
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
