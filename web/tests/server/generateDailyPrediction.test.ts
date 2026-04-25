import { describe, expect, it, vi } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { buildTransitOverlay, generateDailyPrediction, type SupabaseDailyClient } from "@/lib/server/generateDailyPrediction";
import type { LlmProvider } from "@/lib/llm/providers";
import type { DailyPrediction, TransitSummary } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const { transitSummary } = vi.hoisted(() => ({
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
          favorable: ["Plan through the Jupiter trine."],
          caution: ["Respect the Saturn kendra pressure."],
          technical_basis: {
            triggered_houses: [5, 10],
            planets_used: ["Saturn", "Jupiter"],
            transit_rules: ["saturn_kendra_pressure", "jupiter_trine_support"],
          },
          tone: "direct",
          answer_schema_version: "daily_v1",
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

    expect(overlay.triggeredHouses).toEqual([5, 10]);
    expect(overlay.hits.map((hit) => hit.rule)).toEqual(["saturn_kendra_pressure", "jupiter_trine_support"]);
    expect(overlay.transits.overlay?.triggered_houses).toEqual([5, 10]);
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
    expect(second.cache.prediction).toBe("hit");
    expect(second.prediction.verdict).toBe(first.prediction.verdict);
  });
});
