import { describe, expect, it } from "vitest";

import { computeBundles } from "@/lib/derived/computeBundles";
import { renderBasicReportPdf } from "@/lib/server/exportBasicReport";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

describe("basic report export", () => {
  it("renders a readable PDF containing base chart sections", () => {
    const pdf = renderBasicReportPdf({
      profile: {
        id: "00000000-0000-4000-8000-000000000001",
        user_id: "00000000-0000-4000-8000-000000000002",
        name: "Golden Profile",
        birth_date: "1990-01-01",
        birth_time: "12:00:00",
        birth_time_confidence: "exact",
        birth_place_text: "Delhi, India",
        latitude: 28.6139,
        longitude: 77.209,
        timezone: "Asia/Kolkata",
        ayanamsha: "lahiri",
        engine_version: "test",
        status: "ready",
        created_at: "2026-04-25T00:00:00Z",
      },
      snapshot: goldenSnapshot,
      chartSnapshotId: "00000000-0000-4000-8000-000000000003",
      derivedPayload: computeBundles(goldenSnapshot),
    });

    const text = pdf.toString("utf8");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("D1 CHART");
    expect(text).toContain("BHAVA CHART");
    expect(text).toContain("MOON CHART");
    expect(text).toContain("Moon:");
  });
});
