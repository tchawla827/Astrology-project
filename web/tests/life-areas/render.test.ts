import { describe, expect, it } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { renderLifeArea } from "@/lib/life-areas/render";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

describe("renderLifeArea", () => {
  it("maps a topic bundle into a deterministic life-area view model", () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "career" });
    const viewModel = renderLifeArea(
      "career",
      payload.topic_bundles.career,
      goldenSnapshot,
      goldenSnapshot.birth_time_confidence ?? "exact",
    );

    expect(viewModel.topic).toBe("career");
    expect(viewModel.title).toBe("Career");
    expect(viewModel.houses.length).toBeGreaterThan(0);
    expect(viewModel.houses[0]?.sign).toBeTruthy();
    expect(viewModel.planets.length).toBeGreaterThan(0);
    expect(viewModel.timing.mahadasha).toBeTruthy();
    expect(viewModel.confidence.note).toContain("Birth time");
  });
});
