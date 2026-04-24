import { describe, expect, it } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { DerivedFeaturePayloadSchema } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

describe("computeBundles", () => {
  it("produces a stable payload for the golden chart snapshot", () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "career" });

    expect(DerivedFeaturePayloadSchema.parse(payload)).toBeTruthy();
    expect(payload.topic_bundles.career.topic).toBe("career");
    expect(payload.dashboard_summary.top_themes.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(payload, null, 2)).toMatchSnapshot();
  });
});
