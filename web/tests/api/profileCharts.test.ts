import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/profile/[id]/charts/[key]/route";

const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

const snapshot = {
  engine_version: "astro_engine_v1",
  summary: { lagna: "Aries", moon_sign: "Cancer", nakshatra: "Pushya", pada: 2 },
  charts: {
    D1: {
      chart_key: "D1",
      ascendant_sign: "Aries",
      houses: Array.from({ length: 12 }, (_, index) => ({ house: index + 1, sign: "Aries", lord: "Mars" })),
      planets: [{ planet: "Sun", sign: "Aries", house: 1 }],
    },
  },
  planetary_positions: [
    {
      planet: "Sun",
      longitude_deg: 12,
      sign: "Aries",
      house: 1,
      nakshatra: "Ashwini",
      pada: 4,
      retrograde: false,
      combust: false,
      dignity: "exalted",
    },
  ],
  aspects: [],
  yogas: [],
  dasha: {
    system: "vimshottari",
    current_mahadasha: { lord: "Sun", start: "2020-01-01", end: "2026-01-01" },
    current_antardasha: { lord: "Moon", start: "2025-01-01", end: "2026-01-01" },
    upcoming: [],
  },
  transits: { as_of: "2026-04-20T06:00:00Z", positions: [], highlights: [] },
};

describe("/api/profile/[id]/charts/[key]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is missing", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });

    const response = await GET({} as never, { params: { id: "profile-1", key: "D1" } });

    expect(response.status).toBe(401);
  });

  it("returns one chart from the latest stored snapshot", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from: (table: string) => {
        if (table === "birth_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: "profile-1" }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "chart_snapshots") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: { id: "snapshot-1", engine_version: "astro_engine_v1", computed_at: "2026-04-20T06:00:00Z", payload: snapshot },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const response = await GET({} as never, { params: { id: "profile-1", key: "D1" } });
    const body = (await response.json()) as { chart?: { chart_key?: string } };

    expect(response.status).toBe(200);
    expect(body.chart?.chart_key).toBe("D1");
  });

  it("rejects unsupported chart keys before querying", async () => {
    const response = await GET({} as never, { params: { id: "profile-1", key: "D99" } });

    expect(response.status).toBe(404);
    expect(createClient).not.toHaveBeenCalled();
  });
});
