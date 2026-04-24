import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/profile/[id]/derived/route";
import { computeBundles } from "@/lib/derived/computeBundles";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

describe("/api/profile/[id]/derived", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is missing", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });

    const response = await GET({} as never, { params: { id: "profile-1" } });

    expect(response.status).toBe(401);
  });

  it("returns the latest derived snapshot for the owned profile", async () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "career" });

    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from(table: string) {
        if (table === "birth_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({ data: { id: "profile-1" }, error: null }),
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "derived_feature_snapshots") {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit() {
                          return {
                            maybeSingle: async () => ({
                              data: {
                                id: "00000000-0000-4000-8000-000000000201",
                                birth_profile_id: "00000000-0000-4000-8000-000000000202",
                                chart_snapshot_id: "00000000-0000-4000-8000-000000000203",
                                schema_version: "derived_v1",
                                computed_at: "2026-04-24T00:00:00Z",
                                payload,
                              },
                              error: null,
                            }),
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    });

    const response = await GET({} as never, { params: { id: "profile-1" } });
    const body = (await response.json()) as { derived?: { schema_version?: string; topic_bundles?: { career?: { topic?: string } } } };

    expect(response.status).toBe(200);
    expect(body.derived?.schema_version).toBe("derived_v1");
    expect(body.derived?.topic_bundles?.career?.topic).toBe("career");
  });
});
