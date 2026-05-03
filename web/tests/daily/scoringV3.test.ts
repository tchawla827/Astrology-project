import { describe, expect, it } from "vitest";

import { scoreDailyAspectsV3 } from "@/lib/daily/scoring/v3";
import type { ChartSnapshot, DashaTimeline, PlanetPlacement, TransitSummary } from "@/lib/schemas";
import { DailyScoreBreakdownSchema } from "@/lib/schemas/daily";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const dashaTiming = {
  system: "vimshottari",
  active_mahadasha: { level: "mahadasha", lord: "Jupiter", start: "2020-01-01", end: "2036-01-01" },
  active_antardasha: { level: "antardasha", lord: "Saturn", start: "2025-01-01", end: "2027-01-01" },
  active_pratyantardasha: { level: "pratyantardasha", lord: "Moon", start: "2026-04-01", end: "2026-05-01" },
} satisfies {
  system: "vimshottari";
  active_mahadasha: DashaTimeline["periods"][number];
  active_antardasha: DashaTimeline["periods"][number];
  active_pratyantardasha: DashaTimeline["periods"][number];
};

function transitWithSaturnDistanceFromMoon(degrees: number): TransitSummary {
  const natalMoon = goldenSnapshot.planetary_positions.find((placement) => placement.planet === "Moon");
  if (!natalMoon) {
    throw new Error("Golden snapshot is missing Moon.");
  }
  const positions = goldenSnapshot.planetary_positions.map((placement): PlanetPlacement => {
    if (placement.planet !== "Saturn") {
      return { ...placement };
    }
    return {
      ...placement,
      longitude_deg: (natalMoon.longitude_deg + degrees) % 360,
      sign: natalMoon.sign,
      house: natalMoon.house,
    };
  });
  return {
    as_of: "2026-04-25T00:00:00Z",
    positions,
    highlights: [],
  };
}

describe("daily Jyotish scoring V3", () => {
  it("returns schema-compatible deterministic scores and capped note counts", () => {
    const result = scoreDailyAspectsV3({
      snapshot: goldenSnapshot,
      transits: transitWithSaturnDistanceFromMoon(8),
      dashaTiming,
      birthTimeConfidence: "exact",
    });

    expect(result.aspect_scores.map((score) => score.aspect)).toEqual(["love", "emotional", "career", "focus"]);
    for (const score of result.aspect_scores) {
      expect(score.score).toBeGreaterThanOrEqual(1);
      expect(score.score).toBeLessThanOrEqual(100);
    }
    for (const breakdown of result.score_breakdown) {
      expect(DailyScoreBreakdownSchema.safeParse(breakdown).success).toBe(true);
      expect(breakdown.notes.length).toBeLessThanOrEqual(12);
    }
    expect(result.score_breakdown.find((score) => score.aspect === "career")?.source_charts).toContain("D10");
    expect(result.score_breakdown.find((score) => score.aspect === "love")?.source_charts).toContain("D9");
    expect(result.score_breakdown.find((score) => score.aspect === "focus")?.source_charts).toContain("D24");
  });

  it("penalizes exact Saturn pressure on natal Moon more than loose pressure", () => {
    const exact = scoreDailyAspectsV3({
      snapshot: goldenSnapshot,
      transits: transitWithSaturnDistanceFromMoon(0.5),
      dashaTiming,
      birthTimeConfidence: "exact",
    });
    const loose = scoreDailyAspectsV3({
      snapshot: goldenSnapshot,
      transits: transitWithSaturnDistanceFromMoon(4.5),
      dashaTiming,
      birthTimeConfidence: "exact",
    });

    const exactEmotional = exact.score_breakdown.find((score) => score.aspect === "emotional");
    const looseEmotional = loose.score_breakdown.find((score) => score.aspect === "emotional");
    expect(exactEmotional?.components.transit_trigger).toBeLessThan(looseEmotional?.components.transit_trigger ?? 0);
    expect(exactEmotional?.raw_score).toBeLessThan(looseEmotional?.raw_score ?? 100);
    expect(exactEmotional?.notes.join(" ")).toContain("Saturn");
  });

  it("uses varga-specific aspects when scoring varga support", () => {
    const base = scoreDailyAspectsV3({
      snapshot: goldenSnapshot,
      transits: transitWithSaturnDistanceFromMoon(8),
      dashaTiming,
      birthTimeConfidence: "exact",
    });
    const d24 = goldenSnapshot.charts.D24;
    if (!d24) {
      throw new Error("Golden snapshot is missing D24.");
    }
    const pressuredSnapshot: ChartSnapshot = {
      ...goldenSnapshot,
      charts: {
        ...goldenSnapshot.charts,
        D24: {
          ...d24,
          aspects: [...(d24.aspects ?? []), { from: "Rahu", to: "Mercury", kind: "conjunction", orb_deg: 0.5 }],
        },
      },
    };
    const pressured = scoreDailyAspectsV3({
      snapshot: pressuredSnapshot,
      transits: transitWithSaturnDistanceFromMoon(8),
      dashaTiming,
      birthTimeConfidence: "exact",
    });

    const baseFocus = base.score_breakdown.find((score) => score.aspect === "focus");
    const pressuredFocus = pressured.score_breakdown.find((score) => score.aspect === "focus");
    expect(pressuredFocus?.components.varga_support).toBeLessThan(baseFocus?.components.varga_support ?? 99);
  });

  it("reduces varga weight when birth time confidence is not exact", () => {
    const exact = scoreDailyAspectsV3({
      snapshot: goldenSnapshot,
      transits: transitWithSaturnDistanceFromMoon(8),
      dashaTiming,
      birthTimeConfidence: "exact",
    });
    const approximate = scoreDailyAspectsV3({
      snapshot: goldenSnapshot,
      transits: transitWithSaturnDistanceFromMoon(8),
      dashaTiming,
      birthTimeConfidence: "approximate",
    });

    const exactCareer = exact.score_breakdown.find((score) => score.aspect === "career");
    const approximateCareer = approximate.score_breakdown.find((score) => score.aspect === "career");

    expect(Math.abs(approximateCareer?.components.varga_support ?? 0)).toBeLessThan(Math.abs(exactCareer?.components.varga_support ?? 0));
    expect(approximateCareer?.notes.join(" ")).toContain("birth time confidence is approximate");
  });
});
