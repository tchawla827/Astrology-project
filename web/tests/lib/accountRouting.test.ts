import { describe, expect, it } from "vitest";

import {
  resolvePostAuthPath,
  resolveSignedInPath,
  withReplaceMode,
  type SupabaseAccountRoutingClient,
} from "@/lib/accountRouting";

function createClient(
  data: unknown,
  error: { message: string } | null = null,
): SupabaseAccountRoutingClient {
  const query = {
    eq() {
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    maybeSingle: async () => ({ data, error }),
  };

  return {
    from: () => ({
      select: () => query,
    }),
  };
}

describe("account routing", () => {
  it("sends users without a profile into onboarding", async () => {
    const destination = await resolveSignedInPath(createClient(null), "user-1");

    expect(destination).toBe("/welcome");
  });

  it("sends users with a processing profile back to generating", async () => {
    const destination = await resolveSignedInPath(
      createClient({ id: "profile-1", status: "processing" }),
      "user-1",
    );

    expect(destination).toBe("/generating?id=profile-1");
  });

  it("keeps explicit app destinations after login", async () => {
    const destination = await resolvePostAuthPath({
      supabase: createClient({ id: "profile-1", status: "ready" }),
      userId: "user-1",
      requestedPath: "/ask?topic=career",
    });

    expect(destination).toBe("/ask?topic=career");
  });

  it("overrides onboarding destinations for returning users", async () => {
    const destination = await resolvePostAuthPath({
      supabase: createClient({ id: "profile-1", status: "ready" }),
      userId: "user-1",
      requestedPath: "/welcome",
    });

    expect(destination).toBe("/dashboard");
  });

  it("preserves replace mode links when requested", () => {
    expect(withReplaceMode("/birth-details", true)).toBe("/birth-details?new=1");
    expect(withReplaceMode("/birth-details", false)).toBe("/birth-details");
  });
});
