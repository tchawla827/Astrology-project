import { describe, expect, it } from "vitest";

import { checkAskQuota } from "@/lib/quotas/askQuota";

function queryResult(data: unknown, count: number | null = null) {
  const query = {
    eq() {
      return query;
    },
    gte() {
      return query;
    },
    lt() {
      return query;
    },
    then(resolve: (value: { data: unknown; count: number | null; error: null }) => void) {
      return Promise.resolve(resolve({ data, count, error: null }));
    },
  };
  return query;
}

describe("ask quota", () => {
  it("allows premium users without a monthly count", async () => {
    const supabase = {
      from(table: string) {
        return {
          select() {
            if (table === "user_profiles") {
              return queryResult({ subscription_tier: "premium" });
            }
            throw new Error(`Unexpected table ${table}`);
          },
        };
      },
    };

    await expect(checkAskQuota({ supabase: supabase as never, userId: "user-1" })).resolves.toMatchObject({
      allowed: true,
      tier: "premium",
      limit: null,
    });
  });

  it("blocks a free user's sixth monthly ask", async () => {
    const supabase = {
      from(table: string) {
        return {
          select() {
            if (table === "user_profiles") {
              return queryResult({ subscription_tier: "free" });
            }
            if (table === "ask_usage") {
              return queryResult(null, 5);
            }
            throw new Error(`Unexpected table ${table}`);
          },
        };
      },
    };

    await expect(
      checkAskQuota({ supabase: supabase as never, userId: "user-1", now: new Date("2026-04-25T00:00:00Z") }),
    ).resolves.toMatchObject({
      allowed: false,
      reason: "quota_exceeded",
      used: 5,
      limit: 5,
    });
  });
});
