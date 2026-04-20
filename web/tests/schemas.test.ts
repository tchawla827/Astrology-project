import { describe, expect, it } from "vitest";

import { AskAnswerSchema, BirthProfileSchema, ToneModeSchema } from "@/lib/schemas";

describe("schemas", () => {
  it("validates tone modes", () => {
    expect(ToneModeSchema.parse("direct")).toBe("direct");
  });

  it("validates birth profile shape", () => {
    const profile = BirthProfileSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "00000000-0000-4000-8000-000000000002",
      name: "Astri Test",
      birth_date: "1990-01-01",
      birth_time: "12:00:00",
      birth_time_confidence: "exact",
      birth_place_text: "Mumbai, India",
      latitude: 19.076,
      longitude: 72.8777,
      timezone: "Asia/Kolkata",
      ayanamsha: "lahiri",
      engine_version: "astro_engine_v1",
      status: "processing",
      created_at: "2026-04-20T00:00:00Z",
    });

    expect(profile.status).toBe("processing");
  });

  it("requires technical basis on ask answers", () => {
    expect(() =>
      AskAnswerSchema.parse({
        verdict: "Move slowly.",
        why: ["Saturn is involved."],
        timing: { summary: "Current period", type: ["dasha"] },
        confidence: { level: "medium", note: "Birth time exact." },
        advice: ["Wait for confirmation."],
        technical_basis: { charts_used: ["D1"], houses_used: [10], planets_used: ["Saturn"] },
      })
    ).not.toThrow();
  });
});
