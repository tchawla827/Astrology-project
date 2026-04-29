import { describe, expect, it, vi } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { buildTransitOverlay, generateDailyPrediction, type SupabaseDailyClient } from "@/lib/server/generateDailyPrediction";
import type { LlmProvider } from "@/lib/llm/providers";
import type { DailyPrediction, TransitSummary } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const { dashaTimeline, panchang, transitSummary } = vi.hoisted(() => ({
  dashaTimeline: {
    system: "vimshottari",
    periods: [
      { level: "mahadasha", lord: "Jupiter", start: "2020-01-01", end: "2036-01-01" },
      { level: "antardasha", lord: "Saturn", start: "2025-01-01", end: "2027-01-01" },
      { level: "pratyantardasha", lord: "Moon", start: "2026-04-01", end: "2026-05-01" },
    ],
  },
  panchang: {
    date: "2026-04-25",
    latitude: 29.39,
    longitude: 76.97,
    tithi: { name: "Navami", end_time: "2026-04-25T12:00:00+05:30" },
    nakshatra: { name: "Rohini", end_time: "2026-04-25T18:00:00+05:30" },
    yoga: { name: "Siddhi", end_time: "2026-04-25T20:00:00+05:30" },
    karana: { name: "Balava", end_time: "2026-04-25T12:00:00+05:30" },
    vaara: "Saturday",
    sunrise: "2026-04-25T05:49:00+05:30",
    sunset: "2026-04-25T18:55:00+05:30",
    muhurta_windows: [
      { name: "Abhijit", start: "2026-04-25T12:00:00+05:30", end: "2026-04-25T12:48:00+05:30", kind: "auspicious" },
    ],
  },
  transitSummary: {
  as_of: "2026-04-25T00:00:00Z",
  positions: [
    {
      planet: "Sun",
      longitude_deg: 20,
      sign: "Aries",
      house: 1,
      nakshatra: "Bharani",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "friendly",
    },
    {
      planet: "Moon",
      longitude_deg: 40,
      sign: "Taurus",
      house: 2,
      nakshatra: "Rohini",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "friendly",
    },
    {
      planet: "Mars",
      longitude_deg: 80,
      sign: "Gemini",
      house: 3,
      nakshatra: "Ardra",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "neutral",
    },
    {
      planet: "Mercury",
      longitude_deg: 110,
      sign: "Cancer",
      house: 4,
      nakshatra: "Ashlesha",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "neutral",
    },
    {
      planet: "Jupiter",
      longitude_deg: 80,
      sign: "Gemini",
      house: 5,
      nakshatra: "Ardra",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "friendly",
    },
    {
      planet: "Venus",
      longitude_deg: 170,
      sign: "Virgo",
      house: 6,
      nakshatra: "Hasta",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "debilitated",
    },
    {
      planet: "Saturn",
      longitude_deg: 300,
      sign: "Scorpio",
      house: 8,
      nakshatra: "Anuradha",
      pada: 1,
      retrograde: false,
      combust: false,
      dignity: "neutral",
    },
    {
      planet: "Rahu",
      longitude_deg: 330,
      sign: "Libra",
      house: 7,
      nakshatra: "Swati",
      pada: 1,
      retrograde: true,
      combust: false,
      dignity: "neutral",
    },
    {
      planet: "Ketu",
      longitude_deg: 150,
      sign: "Aries",
      house: 1,
      nakshatra: "Bharani",
      pada: 1,
      retrograde: true,
      combust: false,
      dignity: "neutral",
    },
  ],
  highlights: [],
  } satisfies TransitSummary,
}));

vi.mock("@/lib/astro/client", () => ({
  getDasha: vi.fn(async () => dashaTimeline),
  getPanchang: vi.fn(async () => panchang),
  getTransits: vi.fn(async () => transitSummary),
}));

const profileId = "00000000-0000-4000-8000-000000000001";
const derivedPayload = computeBundles(goldenSnapshot);

class DailySupabaseMock implements SupabaseDailyClient {
  readonly predictionCache: unknown[] = [];
  readonly transitCache: unknown[] = [];
  profile = {
    id: profileId,
    user_id: "00000000-0000-4000-8000-000000000002",
    name: "Astri User",
    birth_date: "1995-06-07",
    birth_time: "23:54:00",
    birth_time_confidence: "approximate" as const,
    birth_place_text: "Panipat",
    latitude: 29.3909,
    longitude: 76.9635,
    timezone: "Asia/Kolkata",
    ayanamsha: "lahiri" as const,
    engine_version: "astro_engine_v1",
    status: "ready" as const,
    created_at: "2026-04-20T00:00:00Z",
  };

  from(table: string) {
    const client = this;
    return {
      select() {
        const filters: Array<{ column: string; value: string | number }> = [];
        const query = {
          eq(column: string, value: string | number) {
            filters.push({ column, value });
            return query;
          },
          gt() {
            return query;
          },
          order() {
            return query;
          },
          limit() {
            return query;
          },
          async maybeSingle() {
            return { data: client.selectSingle(table, filters), error: null };
          },
        };
        return query;
      },
      async upsert(payload: unknown) {
        if (table === "daily_predictions_cache") {
          client.predictionCache.splice(0, client.predictionCache.length, payload);
          return { error: null };
        }
        if (table === "daily_transit_cache") {
          client.transitCache.splice(0, client.transitCache.length, payload);
          return { error: null };
        }
        throw new Error(`Unexpected upsert table ${table}`);
      },
    };
  }

  private selectSingle(table: string, filters: Array<{ column: string; value: string | number }>) {
    if (table === "birth_profiles") {
      return this.profile;
    }
    if (table === "chart_snapshots") {
      return {
        id: "chart-1",
        engine_version: "astro_engine_v1",
        computed_at: "2026-04-24T00:00:00Z",
        payload: goldenSnapshot,
      };
    }
    if (table === "derived_feature_snapshots") {
      return {
        id: "derived-1",
        schema_version: "derived_v1",
        computed_at: "2026-04-24T00:00:00Z",
        payload: derivedPayload,
      };
    }
    if (table === "daily_predictions_cache") {
      const match = this.predictionCache[0] as
        | { birth_profile_id: string; date: string; tone: string; answer_schema_version: string; payload: DailyPrediction; computed_at: string }
        | undefined;
      if (!match) {
        return null;
      }
      const get = (column: string) => filters.find((filter) => filter.column === column)?.value;
      return match.birth_profile_id === get("birth_profile_id") &&
        match.date === get("date") &&
        match.tone === get("tone") &&
        match.answer_schema_version === get("answer_schema_version")
        ? { payload: match.payload, computed_at: match.computed_at }
        : null;
    }
    if (table === "daily_transit_cache") {
      const match = this.transitCache[0] as { payload: TransitSummary; computed_at: string } | undefined;
      return match ? { payload: match.payload, computed_at: match.computed_at } : null;
    }
    throw new Error(`Unexpected select table ${table}`);
  }
}

function provider(): LlmProvider {
  return {
    name: "gemini",
    defaultModel: "daily-mock",
    async generate() {
      return {
        latency_ms: 1,
        output: {
          date: "2026-04-25",
          verdict: "Jupiter support is active, while Saturn asks for restraint.",
          felt_sense: "You may feel steady enough to work, with some emotional weight in the background.",
          aspect_scores: [
            {
              aspect: "love",
              score: 5,
              label: "mixed",
              sentence: "Love is workable if expectations stay simple.",
              basis: { houses: [5], planets: ["Jupiter", "Moon"], transit_rules: ["jupiter_trine_support", "moon_daily_house_focus"] },
            },
            {
              aspect: "emotional",
              score: 4,
              label: "mixed",
              sentence: "Emotionally, the day is sensitive but manageable.",
              basis: { houses: [4], planets: ["Saturn", "Moon"], transit_rules: ["saturn_kendra_pressure", "moon_daily_house_focus"] },
            },
            {
              aspect: "career",
              score: 6,
              label: "steady",
              sentence: "Career work is supported through steady execution.",
              basis: { houses: [10], planets: ["Saturn", "Jupiter"], transit_rules: ["saturn_kendra_pressure", "jupiter_trine_support"] },
            },
            {
              aspect: "focus",
              score: 6,
              label: "steady",
              sentence: "Focus is steady enough for one clear priority.",
              basis: { houses: [10], planets: ["Saturn", "Moon"], transit_rules: ["saturn_kendra_pressure", "moon_daily_house_focus"] },
            },
          ],
          favorable: ["Plan through the Jupiter trine."],
          caution: ["Respect the Saturn kendra pressure."],
          technical_basis: {
            triggered_houses: [4, 5, 10],
            planets_used: ["Saturn", "Jupiter", "Moon"],
            transit_rules: ["saturn_kendra_pressure", "jupiter_trine_support", "moon_daily_house_focus"],
          },
          tone: "direct",
          answer_schema_version: "daily_v2",
        },
      };
    },
  };
}

function driftingScoreProvider(input: { tone: DailyPrediction["tone"]; focusScore: number }): LlmProvider {
  const base = provider();
  return {
    ...base,
    async generate(args) {
      const result = await base.generate(args);
      const output = result.output as DailyPrediction;
      return {
        ...result,
        output: {
          ...output,
          tone: input.tone,
          aspect_scores: output.aspect_scores.map((score) =>
            score.aspect === "focus"
              ? {
                  ...score,
                  score: input.focusScore,
                  label: input.focusScore <= 3 ? "low" : input.focusScore <= 5 ? "mixed" : input.focusScore <= 7 ? "steady" : "strong",
                  sentence: `Provider tried to make focus ${input.focusScore}.`,
                }
              : score,
          ),
        },
      };
    },
  };
}

describe("generateDailyPrediction", () => {
  it("computes overlay houses from cached transit positions", () => {
    const overlay = buildTransitOverlay({
      transits: transitSummary,
      natalPositions: goldenSnapshot.planetary_positions,
      lagnaSign: "Aquarius",
    });

    expect(overlay.triggeredHouses).toEqual([4, 5, 10]);
    expect(overlay.hits.map((hit) => hit.rule)).toEqual([
      "saturn_kendra_pressure",
      "jupiter_trine_support",
      "moon_daily_house_focus",
    ]);
    expect(overlay.transits.overlay?.triggered_houses).toEqual([4, 5, 10]);
  });

  it("writes and reuses the per-profile daily prediction cache by tone", async () => {
    const supabase = new DailySupabaseMock();
    const first = await generateDailyPrediction({
      supabase,
      profile_id: profileId,
      date: "2026-04-25",
      tone: "direct",
      providers: [provider()],
    });
    const second = await generateDailyPrediction({
      supabase,
      profile_id: profileId,
      date: "2026-04-25",
      tone: "direct",
      providers: [
        {
          ...provider(),
          async generate() {
            throw new Error("cache should bypass provider");
          },
        },
      ],
    });

    expect(first.cache.prediction).toBe("miss");
    expect(first.context.panchang.tithi).toBe("Navami");
    expect(first.context.dasha_timing.active_pratyantardasha?.lord).toBe("Moon");
    expect(second.cache.prediction).toBe("hit");
    expect(second.prediction.verdict).toBe(first.prediction.verdict);
  });

  it("normalizes provider output that misses strict schema fields", async () => {
    const supabase = new DailySupabaseMock();
    const result = await generateDailyPrediction({
      supabase,
      profile_id: profileId,
      date: "2026-04-25",
      tone: "direct",
      providers: [
        {
          name: "gemini",
          defaultModel: "daily-mock",
          async generate() {
            return {
              latency_ms: 1,
              output: {
                date: "wrong-date",
                verdict: "Use the Abhijit window for clean execution while Saturn asks for restraint.",
                favorable: "Abhijit supports focused work.",
                caution: ["Avoid overstating the Moon signal."],
                technical_basis: {
                  triggered_houses: [99],
                  planets_used: ["Pluto"],
                  transit_rules: ["invented_rule"],
                },
                tone: "balanced",
                answer_schema_version: "daily_v1_timing_context",
              },
            };
          },
        },
      ],
    });

    expect(result.prediction.date).toBe("2026-04-25");
    expect(result.prediction.tone).toBe("direct");
    expect(result.prediction.answer_schema_version).toBe("daily_v2");
    expect(result.prediction.felt_sense).toBeTruthy();
    expect(result.prediction.aspect_scores.map((score) => score.aspect)).toEqual(["love", "emotional", "career", "focus"]);
    expect(result.prediction.favorable).toEqual(["Abhijit supports focused work."]);
    expect(result.prediction.technical_basis.triggered_houses).toEqual([4, 5, 10]);
    expect(result.prediction.technical_basis.planets_used).toEqual(expect.arrayContaining(["Saturn", "Jupiter", "Moon", "Mercury"]));
    expect(result.prediction.technical_basis.transit_rules).toEqual(expect.arrayContaining([
      "saturn_kendra_pressure",
      "jupiter_trine_support",
      "moon_daily_house_focus",
    ]));
    expect(result.prediction.score_breakdown?.map((score) => score.aspect)).toEqual(["love", "emotional", "career", "focus"]);
    expect(result.prediction.score_breakdown?.find((score) => score.aspect === "career")?.source_charts).toContain("D10");
    expect(result.prediction.score_breakdown?.find((score) => score.aspect === "love")?.source_charts).toContain("D9");
    expect(result.prediction.score_breakdown?.find((score) => score.aspect === "emotional")?.source_charts).toContain("Moon");
    expect(result.prediction.score_breakdown?.find((score) => score.aspect === "focus")?.source_charts).toContain("D24");
  });

  it("keeps chart-derived scores stable when only tone changes", async () => {
    const balanced = await generateDailyPrediction({
      supabase: new DailySupabaseMock(),
      profile_id: profileId,
      date: "2026-04-25",
      tone: "balanced",
      providers: [driftingScoreProvider({ tone: "balanced", focusScore: 3 })],
    });
    const brutal = await generateDailyPrediction({
      supabase: new DailySupabaseMock(),
      profile_id: profileId,
      date: "2026-04-25",
      tone: "brutal",
      providers: [driftingScoreProvider({ tone: "brutal", focusScore: 8 })],
    });

    expect(balanced.prediction.tone).toBe("balanced");
    expect(brutal.prediction.tone).toBe("brutal");
    expect(balanced.prediction.aspect_scores.map(({ aspect, score, label, basis }) => ({ aspect, score, label, basis }))).toEqual(
      brutal.prediction.aspect_scores.map(({ aspect, score, label, basis }) => ({ aspect, score, label, basis })),
    );
    expect(balanced.prediction.aspect_scores.find((score) => score.aspect === "focus")?.score).not.toBe(3);
    expect(brutal.prediction.aspect_scores.find((score) => score.aspect === "focus")?.score).not.toBe(8);
    expect(brutal.prediction.aspect_scores.find((score) => score.aspect === "focus")?.sentence).not.toContain("8");
    expect(balanced.prediction.score_breakdown).toEqual(brutal.prediction.score_breakdown);
  });
});
