import { describe, expect, it } from "vitest";

import { buildDashboardViewModel } from "@/lib/server/loadDashboard";
import type { ChartSnapshot } from "@/lib/astro/client";

const snapshot: ChartSnapshot = {
  engine_version: "astro_engine_v1",
  computed_at: "2026-04-20T06:00:00Z",
  summary: { lagna: "Capricorn", moon_sign: "Virgo", nakshatra: "Uttara Phalguni", pada: 4 },
  charts: {
    D1: {
      chart_key: "D1",
      ascendant_sign: "Capricorn",
      houses: Array.from({ length: 12 }, (_, index) => ({ house: index + 1, sign: "Aries", lord: "Mars" })),
      planets: [{ planet: "Saturn", sign: "Aries", house: 10 }],
    },
  },
  planetary_positions: [
    {
      planet: "Moon",
      longitude_deg: 150.2,
      sign: "Virgo",
      house: 9,
      nakshatra: "Uttara Phalguni",
      pada: 4,
      retrograde: false,
      combust: false,
      dignity: "neutral",
    },
  ],
  aspects: [],
  yogas: [
    {
      name: "Career pressure signal",
      confidence: "medium",
      source_charts: ["D1"],
      notes: ["Saturn is connected to the 10th house of profession."],
    },
  ],
  dasha: {
    system: "vimshottari",
    current_mahadasha: { lord: "Saturn", start: "2020-01-01", end: "2039-01-01" },
    current_antardasha: { lord: "Mercury", start: "2025-01-01", end: "2027-01-01" },
    upcoming: [],
  },
  transits: {
    as_of: "2026-04-20T06:00:00Z",
    positions: [
      {
        planet: "Saturn",
        longitude_deg: 20,
        sign: "Aries",
        house: 10,
        nakshatra: "Bharani",
        pada: 1,
        retrograde: false,
        combust: false,
        dignity: "debilitated",
      },
    ],
    highlights: ["Saturn over natal 10th house"],
  },
};

const profile = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Astri User",
  status: "ready" as const,
  birth_date: "1995-06-07",
  birth_time: "23:54:00",
  birth_time_confidence: "approximate" as const,
  birth_place_text: "Panipat, Haryana, India",
  latitude: 29.3909,
  longitude: 76.9635,
  timezone: "Asia/Kolkata",
  ayanamsha: "lahiri" as const,
  engine_version: "astro_engine_v1",
  created_at: "2026-04-20T06:00:00Z",
};

describe("buildDashboardViewModel", () => {
  it("builds dashboard cards from chart snapshot data", () => {
    const dashboard = buildDashboardViewModel(
      profile,
      snapshot,
      {
        id: "snapshot-1",
        engine_version: "astro_engine_v1",
        computed_at: "2026-04-20T06:00:00Z",
        payload: snapshot,
      },
      "career",
    );

    expect(dashboard.status).toBe("ready");
    expect(dashboard.summary?.lagna).toBe("Capricorn");
    expect(dashboard.topThemes).toContain("Work over recognition");
    expect(dashboard.transits?.highlights).toEqual(["Saturn over natal 10th house"]);
    expect(dashboard.focusCards?.[0]?.why).toEqual({
      charts: ["D1", "Transit"],
      houses: [10],
      planets: ["Saturn"],
    });
    expect(dashboard.askQuestions).toContain("Why has my career felt stuck?");
  });

  it("uses phase-05 dashboard summary when a derived payload exists", () => {
    const dashboard = buildDashboardViewModel(
      profile,
      snapshot,
      {
        id: "snapshot-1",
        engine_version: "astro_engine_v1",
        computed_at: "2026-04-20T06:00:00Z",
        payload: snapshot,
      },
      "full-chart",
      {
        dashboard_summary: {
          top_themes: ["Derived theme one", "Derived theme two"],
          focus_cards: [
            {
              id: "derived-focus",
              title: "Derived focus",
              body: "Derived body",
              why: { charts: ["D10"], houses: [10], planets: ["Saturn"] },
            },
          ],
        },
      },
    );

    expect(dashboard.topThemes).toEqual(["Derived theme one", "Derived theme two"]);
    expect(dashboard.focusCards?.[0]?.id).toBe("derived-focus");
  });
});
