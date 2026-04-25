import { describe, expect, it, vi } from "vitest";

import { loadPanchang, type SupabasePanchangClient } from "@/lib/server/loadPanchang";
import type { Panchang } from "@/lib/schemas";

const panchang = {
  date: "2026-04-25",
  latitude: 29.3909,
  longitude: 76.9635,
  tithi: { name: "Shukla Panchami", fraction_left: 0.4 },
  nakshatra: { name: "Rohini", fraction_left: 0.6 },
  yoga: { name: "Vishkambha", fraction_left: 0.2 },
  karana: { name: "Bava", fraction_left: 0.3 },
  vaara: "Saturday",
  sunrise: "05:42:00",
  sunset: "19:18:00",
  muhurta_windows: [
    { name: "Abhijit Muhurta", start: "11:45:00", end: "12:33:00", kind: "auspicious" },
    { name: "Rahu Kaal", start: "07:30:00", end: "09:00:00", kind: "inauspicious" },
    { name: "Yamaganda", start: "10:30:00", end: "12:00:00", kind: "inauspicious" },
    { name: "Gulika Kaal", start: "13:30:00", end: "15:00:00", kind: "inauspicious" },
  ],
} satisfies Panchang;

const getPanchang = vi.hoisted(() => vi.fn(async () => panchang));

vi.mock("@/lib/astro/client", () => ({
  AstroEngineError: class AstroEngineError extends Error {
    constructor(message: string) {
      super(message);
    }
  },
  getPanchang,
}));

class PanchangSupabaseMock implements SupabasePanchangClient {
  cache: unknown[] = [];
  profile = {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "user-1",
    name: "Astri User",
    birth_place_text: "Panipat, Haryana, India",
    latitude: 29.3909,
    longitude: 76.9635,
    timezone: "Asia/Kolkata",
    ayanamsha: "lahiri" as const,
    status: "ready" as const,
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
        if (table !== "panchang_cache") {
          throw new Error(`Unexpected upsert table ${table}`);
        }
        client.cache.splice(0, client.cache.length, payload);
        return { error: null };
      },
    };
  }

  private selectSingle(table: string, filters: Array<{ column: string; value: string | number }>) {
    if (table === "birth_profiles") {
      return this.profile;
    }
    if (table === "panchang_cache") {
      const match = this.cache[0] as
        | { date: string; lat_rounded: number; lon_rounded: number; timezone: string; ayanamsha: string; payload: Panchang; computed_at: string }
        | undefined;
      if (!match) {
        return null;
      }
      const get = (column: string) => filters.find((filter) => filter.column === column)?.value;
      return match.date === get("date") &&
        match.lat_rounded === get("lat_rounded") &&
        match.lon_rounded === get("lon_rounded") &&
        match.timezone === get("timezone") &&
        match.ayanamsha === get("ayanamsha")
        ? { payload: match.payload, computed_at: match.computed_at }
        : null;
    }
    throw new Error(`Unexpected table ${table}`);
  }
}

describe("loadPanchang", () => {
  it("writes and reuses the panchang cache for the same date and rounded location", async () => {
    getPanchang.mockClear();
    const supabase = new PanchangSupabaseMock();
    const first = await loadPanchang({ supabase, userId: "user-1", date: "2026-04-25" });
    const second = await loadPanchang({ supabase, userId: "user-1", date: "2026-04-25" });

    expect(first.cache).toBe("miss");
    expect(second.cache).toBe("hit");
    expect(second.panchang.tithi.name).toBe("Shukla Panchami");
    expect(getPanchang).toHaveBeenCalledTimes(1);
  });

  it("uses location overrides for the engine request", async () => {
    getPanchang.mockClear();
    const supabase = new PanchangSupabaseMock();
    await loadPanchang({
      supabase,
      userId: "user-1",
      date: "2026-04-25",
      override: { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", label: "New York" },
    });

    expect(getPanchang).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" }),
    );
  });
});
