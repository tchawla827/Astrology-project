import { describe, expect, it, vi } from "vitest";

import { generateProfileForBirthProfile } from "@/lib/server/generateProfile";

const snapshot = {
  engine_version: "astro_engine_v1",
  summary: { lagna: "Aquarius", moon_sign: "Virgo", nakshatra: "Uttara Phalguni", pada: 4 },
  charts: {
    D1: {
      chart_key: "D1",
      ascendant_sign: "Aquarius",
      houses: Array.from({ length: 12 }, (_, index) => ({ house: index + 1, sign: "Aries", lord: "Mars" })),
      planets: [{ planet: "Sun", sign: "Taurus", house: 4 }],
    },
  },
  planetary_positions: [
    {
      planet: "Sun",
      longitude_deg: 22.1,
      sign: "Taurus",
      house: 4,
      nakshatra: "Rohini",
      pada: 3,
      retrograde: false,
      combust: false,
      dignity: "friendly",
    },
  ],
  aspects: [],
  yogas: [],
  dasha: {
    system: "vimshottari",
    current_mahadasha: { lord: "Rahu", start: "2006-05-16", end: "2024-05-16" },
    current_antardasha: { lord: "Jupiter", start: "2015-07-13", end: "2017-12-06" },
    upcoming: [],
  },
  transits: { as_of: "2026-04-20T06:00:00Z", positions: [], highlights: [] },
};

function createSupabaseMock() {
  const calls: Array<{ table: string; operation: string; payload?: unknown }> = [];
  return {
    calls,
    from(table: string) {
      return {
        insert(payload: unknown) {
          calls.push({ table, operation: "insert", payload });
          return {
            error: null,
            select() {
              return {
                single: async () => ({ data: { id: "chart-snapshot-1" }, error: null }),
              };
            },
          };
        },
        update(payload: unknown) {
          calls.push({ table, operation: "update", payload });
          return {
            eq() {
              return { error: null };
            },
          };
        },
      };
    },
  };
}

describe("generateProfileForBirthProfile", () => {
  it("stores the chart snapshot and marks the birth profile ready", async () => {
    const supabase = createSupabaseMock();
    const astroProfile = vi.fn(async () => snapshot);
    const generateDerivedFeaturesFn = vi.fn(async () => null);

    await generateProfileForBirthProfile({
      supabase,
      birthProfileId: "00000000-0000-4000-8000-000000000001",
      input: {
        birth_date: "1995-05-16",
        birth_time: "12:00:00",
        timezone: "Asia/Kolkata",
        latitude: 29.3909,
        longitude: 76.9635,
        ayanamsha: "lahiri",
      },
      astroProfile,
      generateDerivedFeaturesFn,
    });

    expect(supabase.calls).toEqual([
      {
        table: "chart_snapshots",
        operation: "insert",
        payload: {
          birth_profile_id: "00000000-0000-4000-8000-000000000001",
          engine_version: "astro_engine_v1",
          payload: {
            ...snapshot,
            birth_profile_id: "00000000-0000-4000-8000-000000000001",
          },
        },
      },
      {
        table: "birth_profiles",
        operation: "update",
        payload: { engine_version: "astro_engine_v1", status: "ready" },
      },
    ]);
    expect(generateDerivedFeaturesFn).toHaveBeenCalledWith({
      chartSnapshotId: "chart-snapshot-1",
      supabase,
    });
  });

  it("marks the birth profile as error when generation fails", async () => {
    const supabase = createSupabaseMock();

    await expect(
      generateProfileForBirthProfile({
        supabase,
        birthProfileId: "00000000-0000-4000-8000-000000000001",
        input: {
          birth_date: "1995-05-16",
          birth_time: "12:00:00",
          timezone: "Asia/Kolkata",
          latitude: 29.3909,
          longitude: 76.9635,
          ayanamsha: "lahiri",
        },
        astroProfile: vi.fn(async () => {
          throw new Error("engine down");
        }),
      })
    ).rejects.toThrow("engine down");

    expect(supabase.calls).toContainEqual({
      table: "birth_profiles",
      operation: "update",
      payload: { status: "error" },
    });
  });
});
