import { describe, expect, it } from "vitest";

import { checkApiRateLimit } from "@/lib/rate-limit/apiRateLimit";

function countQuery(count: number | null) {
  const query = {
    eq() {
      return query;
    },
    gte() {
      return query;
    },
    then(resolve: (value: { data: null; count: number | null; error: null }) => void) {
      return Promise.resolve(resolve({ data: null, count, error: null }));
    },
  };
  return query;
}

describe("api rate limit", () => {
  it("records and allows requests under the limit", async () => {
    const inserts: unknown[] = [];
    const supabase = {
      from() {
        return {
          select() {
            return countQuery(9);
          },
          insert(payload: unknown) {
            inserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    await expect(
      checkApiRateLimit({
        supabase: supabase as never,
        userId: "user-1",
        key: "ask",
        now: new Date("2026-04-25T12:00:00.000Z"),
      }),
    ).resolves.toMatchObject({
      allowed: true,
      limit: 10,
      used: 10,
      remaining: 0,
    });
    expect(inserts).toEqual([{ user_id: "user-1", key: "ask" }]);
  });

  it("blocks requests at the limit without recording another event", async () => {
    const inserts: unknown[] = [];
    const supabase = {
      from() {
        return {
          select() {
            return countQuery(10);
          },
          insert(payload: unknown) {
            inserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    await expect(
      checkApiRateLimit({
        supabase: supabase as never,
        userId: "user-1",
        key: "ask",
        now: new Date("2026-04-25T12:00:00.000Z"),
      }),
    ).resolves.toMatchObject({
      allowed: false,
      limit: 10,
      used: 10,
      remaining: 0,
      retryAfterSeconds: 60,
    });
    expect(inserts).toEqual([]);
  });
});
