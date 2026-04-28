import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

const mocks = vi.hoisted(() => {
  const redirect = vi.fn((path: string) => {
    const error = new Error("NEXT_REDIRECT") as Error & { path: string };
    error.path = path;
    throw error;
  });

  return {
    getUser: vi.fn(),
    maybeSingle: vi.fn(),
    redirect,
  };
});

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: mocks.maybeSingle,
            }),
          }),
        }),
      }),
    }),
  }),
}));

describe("home page auth routing", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    mocks.getUser.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.redirect.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("redirects signed-in users with a ready profile to the dashboard", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { id: "profile-1", status: "ready" }, error: null });

    await expect(HomePage()).rejects.toMatchObject({ path: "/dashboard" });

    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps signed-out visitors on the public landing page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(HomePage()).resolves.toBeTruthy();

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
});
