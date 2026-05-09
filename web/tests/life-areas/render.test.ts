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
      payload.topic_evidence_v1.career,
    );

    expect(viewModel.topic).toBe("career");
    expect(viewModel.title).toBe("Career");
    expect(viewModel.houses.length).toBeGreaterThan(0);
    expect(viewModel.houses[0]?.sign).toBeTruthy();
    expect(viewModel.planets.length).toBeGreaterThan(0);
    expect(viewModel.timing.mahadasha).toBeTruthy();
    expect(viewModel.confidence.note).toContain("Birth time");
    expect(viewModel.evidence?.verdict).toContain("Career");
    expect(viewModel.evidence?.overview.lifelong_pattern).toContain("whole-life career pattern");
    expect(viewModel.evidence?.overview.current_phase).toContain("Right now");
    expect(viewModel.evidence?.primary_factors[0]?.label).toBe("Whole-life career structure");
  });

  it("builds structured evidence for non-career life areas", () => {
    const payload = computeBundles(goldenSnapshot, { onboardingIntent: "wealth" });
    const viewModel = renderLifeArea(
      "wealth",
      payload.topic_bundles.wealth,
      goldenSnapshot,
      goldenSnapshot.birth_time_confidence ?? "exact",
    );

    expect(viewModel.evidence?.topic).toBe("wealth");
    expect(viewModel.evidence?.overview.lifelong_pattern).toContain("whole-life wealth");
    expect(viewModel.evidence?.primary_factors[0]?.label).toContain("wealth");
  });
});
