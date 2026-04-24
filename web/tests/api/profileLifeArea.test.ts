import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/profile/[id]/life-areas/[topic]/route";
import { computeBundles } from "@/lib/derived/computeBundles";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

describe("/api/profile/[id]/life-areas/[topic]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for a non-MVP topic", async () => {
    const response = await GET({} as never, { params: { id: "profile-1", topic: "marriage" } });
    expect(response.status).toBe(404);
  });

  it("returns a life-area bundle plus view model for an owned profile", async () => {
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
                        order() {
                          return {
                            limit() {
                              return {
                                maybeSingle: async () => ({
                                  data: {
                                    id: "profile-1",
                                    user_id: "user-1",
                                    name: "Astri User",
                                    status: "ready",
                                    birth_time_confidence: "approximate",
                                    created_at: "2026-04-24T00:00:00Z",
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
            },
          };
        }

        if (table === "chart_snapshots") {
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
                              data: { payload: goldenSnapshot },
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
                              data: { payload },
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

        if (table === "user_profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { default_tone_mode: "direct" },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    });

    const response = await GET({} as never, { params: { id: "profile-1", topic: "career" } });
    const body = (await response.json()) as {
      bundle?: { topic?: string };
      viewModel?: { title?: string; timing?: { mahadasha?: string } };
      default_tone_mode?: string;
    };

    expect(response.status).toBe(200);
    expect(body.bundle?.topic).toBe("career");
    expect(body.viewModel?.title).toBe("Career");
    expect(body.viewModel?.timing?.mahadasha).toBeTruthy();
    expect(body.default_tone_mode).toBe("direct");
  });
});
