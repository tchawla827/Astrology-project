import { describe, expect, it } from "vitest";

import { makeShareUrl, moderateShareAnswer } from "@/lib/sharing/tokens";

describe("share token helpers", () => {
  it("builds a stable public share URL", () => {
    expect(makeShareUrl("abc123", "https://astri.app/")).toBe("https://astri.app/share/abc123");
  });

  it("blocks overly long or profane share copy", () => {
    expect(moderateShareAnswer({ verdict: "Clear enough to share.", why: ["This is concise."] }).allowed).toBe(true);
    expect(moderateShareAnswer({ verdict: "x".repeat(221), why: ["This is concise."] }).allowed).toBe(false);
    expect(moderateShareAnswer({ verdict: "This is shit.", why: ["This is concise."] }).allowed).toBe(false);
  });
});
