import { describe, expect, it, vi } from "vitest";

import { getTransits } from "@/lib/astro/client";
import {
  AstrologyFactsExportInputError,
  loadAstrologyFactsExportData,
  renderAstrologyFactsJson,
  type SupabaseAstrologyFactsExportClient,
} from "@/lib/server/exportAstrologyFacts";
import type { TransitSummary } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const { transitSummary } = vi.hoisted(() => ({
  transitSummary: {
    as_of: "2026-04-24T18:30:00.000Z",
    positions: [
      {
        planet: "Sun",
        longitude_deg: 10,
        sign: "Aries",
        house: 3,
        nakshatra: "Ashwini",
        pada: 1,
        retrograde: false,
        combust: false,
        dignity: "exalted",
      },
      {
        planet: "Moon",
        longitude_deg: 45,
        sign: "Taurus",
        house: 4,
        nakshatra: "Rohini",
        pada: 2,
        retrograde: false,
        combust: false,
        dignity: "exalted",
      },
    ],
    highlights: ["Jupiter support on trine 5"],
    overlay: {
      triggered_houses: [5],
      planet_to_house: {
        Sun: 3,
        Moon: 4,
        Mars: 5,
        Mercury: 6,
        Jupiter: 7,
        Venus: 8,
        Saturn: 9,
        Rahu: 10,
        Ketu: 11,
      },
    },
  } satisfies TransitSummary,
}));

vi.mock("@/lib/astro/client", () => ({
  getTransits: vi.fn(async () => transitSummary),
}));

const userId = "00000000-0000-4000-8000-000000000002";
const profileId = "00000000-0000-4000-8000-000000000001";

class ExportSupabaseMock implements SupabaseAstrologyFactsExportClient {
  from(table: string) {
    const client = this;
    return {
      select() {
        const filters: Array<{ column: string; value: string }> = [];
        const query = {
          eq(column: string, value: string) {
            filters.push({ column, value });
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
    };
  }

  private selectSingle(table: string, filters: Array<{ column: string; value: string }>) {
    const get = (column: string) => filters.find((filter) => filter.column === column)?.value;
    if (table === "birth_profiles") {
      if (get("user_id") !== userId) {
        return null;
      }
      return {
        id: profileId,
        user_id: userId,
        name: "Golden Profile",
        birth_date: "1990-01-01",
        birth_time: "12:00:00",
        birth_time_confidence: "exact",
        birth_place_text: "Delhi, India",
        latitude: 28.6139,
        longitude: 77.209,
        timezone: "Asia/Kolkata",
        ayanamsha: "lahiri",
        engine_version: "astro_engine_v1",
        status: "ready",
        created_at: "2026-04-25T00:00:00Z",
      };
    }
    if (table === "chart_snapshots") {
      if (get("birth_profile_id") !== profileId) {
        return null;
      }
      return {
        id: "00000000-0000-4000-8000-000000000003",
        engine_version: "astro_engine_v1",
        computed_at: "2026-04-25T00:00:00Z",
        payload: goldenSnapshot,
      };
    }
    throw new Error(`Unexpected table ${table}`);
  }
}

describe("astrology facts export", () => {
  it("builds factual chart and transit JSON without interpretations or scores", async () => {
    const data = await loadAstrologyFactsExportData({
      supabase: new ExportSupabaseMock(),
      userId,
      date: "2026-04-25",
    });

    expect(data.export_kind).toBe("charts_transits_json");
    expect(data.requested_date).toBe("2026-04-25");
    expect(data.transit_at).toBe("2026-04-24T18:30:00.000Z");
    expect(data.chart_snapshot.chart_keys).toEqual(Object.keys(goldenSnapshot.charts).sort());
    expect(data.chart_snapshot.charts.D1).toEqual(goldenSnapshot.charts.D1);
    expect(data.transits.positions).toEqual(transitSummary.positions);
    expect(data.transits.natal_overlay.planet_to_house).toEqual(transitSummary.overlay?.planet_to_house);
    expect(data.transits).not.toHaveProperty("highlights");

    const json = renderAstrologyFactsJson(data).toString("utf8");
    expect(JSON.parse(json)).toEqual(data);
    expect(json).not.toContain("verdict");
    expect(json).not.toContain("aspect_scores");
    expect(json).not.toContain("score_breakdown");
    expect(json).not.toContain("Jupiter support on trine 5");
    expect(getTransits).toHaveBeenCalledWith(
      expect.objectContaining({
        at: "2026-04-24T18:30:00.000Z",
        natal: {
          lagna_sign: goldenSnapshot.summary.lagna,
          planetary_positions: goldenSnapshot.planetary_positions,
        },
      }),
    );
  });

  it("rejects invalid calendar dates before calling the engine", async () => {
    await expect(
      loadAstrologyFactsExportData({
        supabase: new ExportSupabaseMock(),
        userId,
        date: "2026-02-31",
      }),
    ).rejects.toBeInstanceOf(AstrologyFactsExportInputError);
  });
});
