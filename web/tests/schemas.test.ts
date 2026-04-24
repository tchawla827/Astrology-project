import { describe, expect, it } from "vitest";

import {
  AskAnswerSchema,
  BirthProfileSchema,
  ChartSnapshotSchema,
  TransitSummarySchema,
  PanchangSchema,
  ToneModeSchema,
} from "@/lib/schemas";

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

  it("accepts engine chart snapshot shape", () => {
    expect(() =>
      ChartSnapshotSchema.parse({
        engine_version: "astro_engine_v1",
        summary: { lagna: "Aquarius", moon_sign: "Virgo", nakshatra: "Uttara Phalguni", pada: 4 },
        charts: {
          D1: {
            chart_key: "D1",
            ascendant_sign: "Aquarius",
            houses: Array.from({ length: 12 }, (_, idx) => ({
              house: idx + 1,
              sign: "Aries",
              lord: "Mars",
            })),
            planets: [{ planet: "Sun", sign: "Taurus", house: 4 }],
          },
        },
        planetary_positions: [
          {
            planet: "Sun",
            longitude_deg: 22.1,
            sign: "Taurus",
            house: 4,
            nakshatra: "Rohini",
            pada: 3,
            retrograde: false,
            combust: false,
            dignity: "friendly",
          },
        ],
        aspects: [],
        yogas: [
          {
            name: "Gajakesari",
            confidence: "high",
            source_charts: ["D1"],
            planets_involved: ["Moon", "Jupiter"],
            notes: ["Moon and Jupiter are in kendra relation."],
          },
        ],
        dasha: {
          system: "vimshottari",
          current_mahadasha: { lord: "Rahu", start: "2006-05-16", end: "2024-05-16" },
          current_antardasha: { lord: "Jupiter", start: "2015-07-13", end: "2017-12-06" },
          upcoming: [],
        },
        transits: {
          as_of: "2026-04-20T06:00:00Z",
          positions: [],
          highlights: [],
        },
        lagna_longitude_deg: 306.21,
      })
    ).not.toThrow();
  });

  it("accepts panchang with fraction-left fields", () => {
    expect(() =>
      PanchangSchema.parse({
        date: "2026-04-20",
        latitude: 29.3909,
        longitude: 76.9635,
        tithi: { name: "Shukla Navami", fraction_left: 0.13 },
        nakshatra: { name: "Uttara Phalguni", fraction_left: 0.06 },
        yoga: { name: "Siddhi", fraction_left: 0.1 },
        karana: { name: "Kaulava", fraction_left: 0.27 },
        vaara: "Wednesday",
        sunrise: "05:26:23",
        sunset: "19:15:31",
        muhurta_windows: [
          { name: "Rahu Kaal", start: "10:30:00", end: "12:00:00", kind: "inauspicious" },
          { name: "Abhijit Muhurta", start: "11:45:00", end: "12:33:00", kind: "auspicious" },
        ],
      })
    ).not.toThrow();
  });

  it("accepts transit overlay output and moolatrikona dignity", () => {
    expect(() =>
      TransitSummarySchema.parse({
        as_of: "2026-04-20T06:00:00Z",
        positions: [
          {
            planet: "Sun",
            longitude_deg: 125.2,
            sign: "Leo",
            house: 1,
            nakshatra: "Magha",
            pada: 2,
            retrograde: false,
            combust: false,
            dignity: "moolatrikona",
          },
        ],
        highlights: ["Saturn pressure on kendra 10"],
        overlay: {
          triggered_houses: [10],
          planet_to_house: {
            Saturn: 10,
            Jupiter: 5,
          },
        },
      })
    ).not.toThrow();
  });
});
