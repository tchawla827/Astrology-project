import { describe, expect, it } from "vitest";

import { normalizeProfileSubmission, resolveTimezoneFromCoordinates } from "@/lib/server/profileIntake";

describe("profile intake normalization", () => {
  const base = {
    name: "Astri Test",
    birth_date: "1995-05-16",
    birth_time: "06:20:00",
    birth_time_confidence: "exact",
    birth_place_text: "Panipat, Haryana, India",
    latitude: 29.3909,
    longitude: 76.9635,
    timezone: "Asia/Kolkata",
    ayanamsha: "lahiri",
  };

  it("rejects future birth dates", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const result = normalizeProfileSubmission({ ...base, birth_date: tomorrow });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.birth_date).toContain("Birth date cannot be in the future.");
    }
  });

  it("requires a selected place with coordinates and timezone", () => {
    const result = normalizeProfileSubmission({ ...base, birth_place_text: "", latitude: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.birth_place_text).toContain("Select a resolved birth place.");
    }
  });

  it("uses noon when birth time is unknown", () => {
    const result = normalizeProfileSubmission({
      ...base,
      birth_time: "",
      birth_time_confidence: "unknown",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.birth_time).toBe("12:00:00");
      expect(result.data.birth_time_confidence).toBe("unknown");
    }
  });
});

describe("timezone resolution", () => {
  it.each([
    ["Panipat", 29.3909, 76.9635, "Asia/Kolkata"],
    ["New York", 40.7128, -74.006, "America/New_York"],
    ["London", 51.5074, -0.1278, "Europe/London"],
    ["Sydney", -33.8688, 151.2093, "Australia/Sydney"],
  ])("resolves %s from coordinates", (_label, latitude, longitude, expected) => {
    expect(resolveTimezoneFromCoordinates(latitude, longitude)).toBe(expected);
  });
});
