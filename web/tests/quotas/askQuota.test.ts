import { describe, expect, it } from "vitest";

import { checkAskQuota } from "@/lib/quotas/askQuota";

describe("ask quota", () => {
  it("allows free users without a monthly count", async () => {
    const supabase = {
      from(table: string) {
        throw new Error(`Unexpected table ${table}`);
      },
    };

    await expect(checkAskQuota({ supabase: supabase as never, userId: "user-1" })).resolves.toMatchObject({
      allowed: true,
      tier: "free",
      limit: null,
      remaining: null,
    });
  });

  it("keeps allowing free users after the old monthly limit", async () => {
    const supabase = {
      from(table: string) {
        throw new Error(`Unexpected table ${table}`);
      },
    };

    await expect(
      checkAskQuota({ supabase: supabase as never, userId: "user-1", now: new Date("2026-04-25T00:00:00Z") }),
    ).resolves.toMatchObject({
      allowed: true,
      tier: "free",
      used: 0,
      limit: null,
      remaining: null,
    });
  });
});
