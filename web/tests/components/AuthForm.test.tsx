import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthForm } from "@/components/auth/AuthForm";

const signInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  }),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    window.history.replaceState({}, "", "/login");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("hides Google auth unless the deployment enables it", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOOGLE_AUTH", "false");

    render(<AuthForm mode="login" />);

    expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull();
  });

  it("starts Google OAuth when enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOOGLE_AUTH", "true");
    signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    render(<AuthForm mode="login" />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() =>
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fwelcome" },
      }),
    );
  });

  it("shows OAuth errors returned before redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_GOOGLE_AUTH", "true");
    signInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: "Unsupported provider: provider is not enabled" },
    });

    render(<AuthForm mode="login" />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(await screen.findByText("Unsupported provider: provider is not enabled")).toBeTruthy();
  });

  it("shows auth errors returned in the redirect URL", async () => {
    window.history.replaceState(
      {},
      "",
      "/login?error=server_error&error_description=Unable+to+exchange+external+code",
    );

    render(<AuthForm mode="login" />);

    expect(await screen.findByText("Unable to exchange external code")).toBeTruthy();
  });
});
