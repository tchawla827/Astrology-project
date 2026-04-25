import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/auth/callback/route";

const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession,
    },
  }),
}));

describe("/auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
  });

  it("exchanges the OAuth code and redirects to onboarding", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc&next=/welcome") as never);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
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
