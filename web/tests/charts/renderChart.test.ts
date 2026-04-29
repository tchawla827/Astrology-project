import { describe, expect, it } from "vitest";

import { chartHasPlanetTechnicalDetails, renderChart } from "@/lib/charts/renderChart";
import type { ChartSnapshot } from "@/lib/schemas";

const houses = [
  { house: 1, sign: "Aries", lord: "Mars" },
  { house: 2, sign: "Taurus", lord: "Venus" },
  { house: 3, sign: "Gemini", lord: "Mercury" },
  { house: 4, sign: "Cancer", lord: "Moon" },
  { house: 5, sign: "Leo", lord: "Sun" },
  { house: 6, sign: "Virgo", lord: "Mercury" },
  { house: 7, sign: "Libra", lord: "Venus" },
  { house: 8, sign: "Scorpio", lord: "Mars" },
  { house: 9, sign: "Sagittarius", lord: "Jupiter" },
  { house: 10, sign: "Capricorn", lord: "Saturn" },
  { house: 11, sign: "Aquarius", lord: "Saturn" },
  { house: 12, sign: "Pisces", lord: "Jupiter" },
] as const;

const snapshot: ChartSnapshot = {
  engine_version: "astro_engine_v1",
  summary: { lagna: "Aries", moon_sign: "Cancer", nakshatra: "Pushya", pada: 2 },
  charts: {
    D1: {
      chart_key: "D1",
      ascendant_sign: "Aries",
      houses: [...houses],
      planets: [
        { planet: "Sun", sign: "Taurus", house: 2 },
        { planet: "Mercury", sign: "Taurus", house: 2 },
        { planet: "Moon", sign: "Cancer", house: 4 },
      ],
    },
    D9: {
      chart_key: "D9",
      ascendant_sign: "Sagittarius",
      ascendant_longitude_deg: 254.2,
      houses: [...houses],
      planets: [
        {
          planet: "Sun",
          sign: "Cancer",
          house: 8,
          longitude_deg: 95.2,
          retrograde: false,
          combust: false,
          varga_symbolic_combust: false,
          dignity: "friendly",
        },
        {
          planet: "Mercury",
          sign: "Leo",
          house: 9,
          longitude_deg: 130.4,
          retrograde: true,
          combust: true,
          varga_symbolic_combust: true,
          dignity: "friendly",
        },
      ],
      aspects: [{ from: "Sun", to: "Mercury", kind: "conjunction", orb_deg: 4.2 }],
    },
  },
  planetary_positions: [
    {
      planet: "Sun",
      longitude_deg: 34.2,
      sign: "Taurus",
      house: 2,
      nakshatra: "Krittika",
      pada: 3,
      retrograde: false,
      combust: false,
      dignity: "friendly",
    },
    {
      planet: "Mercury",
      longitude_deg: 36.1,
      sign: "Taurus",
      house: 2,
      nakshatra: "Rohini",
      pada: 1,
      retrograde: true,
      combust: true,
      dignity: "neutral",
    },
    {
      planet: "Moon",
      longitude_deg: 100.1,
      sign: "Cancer",
      house: 4,
      nakshatra: "Pushya",
      pada: 2,
      retrograde: false,
      combust: false,
      dignity: "own",
    },
  ],
  aspects: [],
  yogas: [
    {
      name: "Raja Yoga",
      confidence: "medium",
      source_charts: ["D1"],
      planets_involved: ["Sun", "Mercury"],
      notes: ["Sun and Mercury are joined in a kendra."],
    },
  ],
  dasha: {
    system: "vimshottari",
    current_mahadasha: { lord: "Moon", start: "2020-01-01", end: "2030-01-01" },
    current_antardasha: { lord: "Sun", start: "2026-01-01", end: "2026-07-01" },
    upcoming: [],
  },
  transits: { as_of: "2026-04-20T06:00:00Z", positions: [], highlights: [] },
};

describe("renderChart", () => {
  it("maps planets to fixed North Indian house coordinates", () => {
    const rendered = renderChart(snapshot, "D1", "north");

    expect(rendered?.houses).toHaveLength(12);
    expect(rendered?.planets.find((planet) => planet.planet === "Moon")?.point).toMatchObject({ x: 28, y: 72 });
    expect(rendered?.planets.find((planet) => planet.planet === "Mercury")?.label).toBe("Me(R)");
    expect(rendered?.planets.find((planet) => planet.planet === "Mercury")?.technicalDetails?.sign).toBe("Taurus");
  });

  it("maps South Indian positions by sign while preserving chart houses", () => {
    const rendered = renderChart(snapshot, "D1", "south");

    expect(rendered?.houses.find((house) => house.sign === "Aries")?.point).toMatchObject({ x: 12.5, y: 12.5 });
    expect(rendered?.planets.find((planet) => planet.planet === "Moon")?.point).toMatchObject({ x: 87.5, y: 12.5 });
  });

  it("returns null for missing charts", () => {
    expect(renderChart(snapshot, "D99")).toBeNull();
  });

  it("does not reuse natal technical details for divisional charts", () => {
    const rendered = renderChart(snapshot, "D9", "north");

    expect(rendered?.planets.find((planet) => planet.planet === "Sun")?.technicalDetails).toBeUndefined();
    expect(rendered?.planets.find((planet) => planet.planet === "Mercury")?.label).toBe("Me(R)");
  });

  it("preserves varga-specific technical metadata separately from natal placements", () => {
    const rendered = renderChart(snapshot, "D9", "north");
    const mercury = rendered?.planets.find((planet) => planet.planet === "Mercury");

    expect(rendered?.chart.aspects?.[0]).toMatchObject({ from: "Sun", to: "Mercury", orb_deg: 4.2 });
    expect(chartHasPlanetTechnicalDetails(rendered!.chart)).toBe(true);
    expect(mercury?.longitude_deg).toBe(130.4);
    expect(mercury?.combust).toBe(true);
    expect(mercury?.varga_symbolic_combust).toBe(true);
  });
});
