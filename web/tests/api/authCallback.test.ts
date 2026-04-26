import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/auth/callback/route";

const exchangeCodeForSession = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession,
      getUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle,
            }),
          }),
        }),
      }),
    }),
  }),
}));

describe("/auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    getUser.mockReset();
    maybeSingle.mockReset();
  });

  it("redirects returning users with a saved profile to the dashboard", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    maybeSingle.mockResolvedValue({ data: { id: "profile-1", status: "ready" }, error: null });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/welcome") as never);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("keeps onboarding for first-time users", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/welcome") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/welcome");
  });

  it("redirects callback errors back to login", async () => {
    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?error=server_error&error_description=Unable+to+exchange+external+code",
      ) as never,
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=auth_callback_failed&error_description=Unable+to+exchange+external+code",
    );
  });
});
