import { describe, expect, it } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { DerivedFeaturePayloadSchema } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

describe("computeBundles", () => {
  it("produces a stable payload for the golden chart snapshot", () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "career" });

    expect(DerivedFeaturePayloadSchema.parse(payload)).toBeTruthy();
    expect(payload.topic_bundles.career.topic).toBe("career");
    expect(payload.topic_evidence_v1.career?.verdict).toContain("Career");
    expect(payload.topic_evidence_v1.career?.supporting_factors.length).toBeGreaterThan(0);
    expect(payload.topic_evidence_v1.career?.citations.charts).toContain("D10");
    for (const topic of [
      "wealth",
      "relationships",
      "marriage",
      "family",
      "health",
      "education",
      "spirituality",
      "relocation",
    ] as const) {
      expect(payload.topic_evidence_v1[topic]?.overview.lifelong_pattern).toBeTruthy();
      expect(payload.topic_evidence_v1[topic]?.primary_factors.length).toBeGreaterThan(0);
    }
    expect(payload.dashboard_summary.top_themes.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(payload, null, 2)).toMatchSnapshot();
  });
});
