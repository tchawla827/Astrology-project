import { describe, expect, it } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { LifeAreaTimingPointSchema, LifeAreaTimingSeriesSchema, type DashaTimeline, type Planet, type TransitSummary } from "@/lib/schemas";
import {
  aggregateMonthlyTimingPoint,
  buildEmotionalTimingBundle,
  buildLifeAreaTimingSeries,
  scoreLifeAreaTimingPoint,
} from "@/lib/timeline/scoring";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const dashaTiming = {
  system: "vimshottari",
  active_mahadasha: {
    level: "mahadasha",
    lord: "Rahu",
    start: "2020-01-01",
    end: "2030-01-01",
  },
  active_antardasha: {
    level: "antardasha",
    lord: "Saturn",
    start: "2025-01-01",
    end: "2027-01-01",
  },
  active_pratyantardasha: {
    level: "pratyantardasha",
    lord: "Mercury",
    start: "2026-01-01",
    end: "2026-03-01",
  },
} satisfies {
  system: "vimshottari";
  active_mahadasha: DashaTimeline["periods"][number];
  active_antardasha: DashaTimeline["periods"][number];
  active_pratyantardasha: DashaTimeline["periods"][number];
};

const transits: TransitSummary = {
  as_of: "2026-01-15T00:00:00.000Z",
  positions: goldenSnapshot.planetary_positions.map((position) =>
    position.planet === "Jupiter"
      ? { ...position, house: 10, longitude_deg: goldenSnapshot.planetary_positions.find((entry) => entry.planet === "Mercury")?.longitude_deg ?? position.longitude_deg }
      : position,
  ),
  highlights: [],
  overlay: {
    triggered_houses: [10],
    planet_to_house: Object.fromEntries(
      goldenSnapshot.planetary_positions.map((position) => [position.planet, position.planet === "Jupiter" ? 10 : position.house]),
    ) as Record<Planet, number>,
  },
};

describe("life-area timing scoring", () => {
  it("scores a daily life-area point with deterministic factors", () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "career" });
    const point = scoreLifeAreaTimingPoint({
      snapshot: goldenSnapshot,
      bundle: payload.topic_bundles.career,
      topic: "career",
      date: "2026-01-15",
      transits,
      dashaTiming,
      birthTimeConfidence: "exact",
    });

    expect(LifeAreaTimingPointSchema.parse(point)).toBeTruthy();
    expect(point.granularity).toBe("daily");
    expect(point.support).toBeGreaterThanOrEqual(0);
    expect(point.support).toBeLessThanOrEqual(100);
    expect(point.pressure).toBeGreaterThanOrEqual(0);
    expect(point.volatility).toBeGreaterThanOrEqual(0);
    expect(point.confidence).toBeGreaterThan(50);
    expect(point.top_factors.length).toBeGreaterThan(0);
  });

  it("aggregates daily points into a monthly series", () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "wealth" });
    const first = scoreLifeAreaTimingPoint({
      snapshot: goldenSnapshot,
      bundle: payload.topic_bundles.wealth,
      topic: "wealth",
      date: "2026-01-15",
      transits,
      dashaTiming,
      birthTimeConfidence: "exact",
    });
    const second = scoreLifeAreaTimingPoint({
      snapshot: goldenSnapshot,
      bundle: payload.topic_bundles.wealth,
      topic: "wealth",
      date: "2026-01-16",
      transits,
      dashaTiming,
      birthTimeConfidence: "exact",
    });
    const monthly = aggregateMonthlyTimingPoint([first, second]);
    const series = buildLifeAreaTimingSeries({
      topic: "wealth",
      year: 2026,
      timezone: "Asia/Kolkata",
      monthly: [monthly],
      daily: [first, second],
    });

    expect(monthly.granularity).toBe("monthly");
    expect(monthly.date).toBe("2026-01-01");
    expect(monthly.support).toBe(Math.round((first.support + second.support) / 2));
    expect(monthly.volatility).toBe(Math.round(((first.volatility + second.volatility) / 2) * 0.65 + Math.max(first.volatility, second.volatility) * 0.35));
    expect(monthly.top_factors.every((factor) => typeof factor.impact === "number")).toBe(true);
    expect(LifeAreaTimingSeriesSchema.parse(series)).toBeTruthy();
    expect(series.scoring_version).toBe("life_area_timing_v2_structured_rules");
  });

  it("scores emotional timing as a self-focused graph aspect", () => {
    const bundle = buildEmotionalTimingBundle(goldenSnapshot);
    const point = scoreLifeAreaTimingPoint({
      snapshot: goldenSnapshot,
      bundle,
      topic: "emotional",
      date: "2026-01-15",
      transits,
      dashaTiming,
      birthTimeConfidence: "exact",
    });
    const series = buildLifeAreaTimingSeries({
      topic: "emotional",
      year: 2026,
      timezone: "Asia/Kolkata",
      monthly: [aggregateMonthlyTimingPoint([point])],
      daily: [point],
    });

    expect(bundle.headline_signals.join(" ")).toContain("Moon");
    expect(point.top_factors.some((factor) => `${factor.label} ${factor.summary}`.includes("emotional"))).toBe(true);
    expect(LifeAreaTimingSeriesSchema.parse(series).topic).toBe("emotional");
  });
});
