import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardPanchangStrip } from "@/components/panchang/DashboardPanchangStrip";
import { MuhurtaTimeline } from "@/components/panchang/MuhurtaTimeline";
import { PanchangCard } from "@/components/panchang/PanchangCard";
import { SunTimes } from "@/components/panchang/SunTimes";
import type { Panchang } from "@/lib/schemas";

const sample = {
  date: "2026-04-25",
  latitude: 29.3909,
  longitude: 76.9635,
  tithi: { name: "Shukla Panchami", fraction_left: 0.4 },
  nakshatra: { name: "Rohini", fraction_left: 0.6 },
  yoga: { name: "Vishkambha", fraction_left: 0.2 },
  karana: { name: "Bava", fraction_left: 0.3 },
  vaara: "Saturday",
  sunrise: "05:42:00",
  sunset: "19:18:00",
  muhurta_windows: [
    { name: "Abhijit Muhurta", start: "11:45:00", end: "12:33:00", kind: "auspicious" },
    { name: "Rahu Kaal", start: "07:30:00", end: "09:00:00", kind: "inauspicious" },
    { name: "Yamaganda", start: "10:30:00", end: "12:00:00", kind: "inauspicious" },
    { name: "Gulika Kaal", start: "13:30:00", end: "15:00:00", kind: "inauspicious" },
  ],
} satisfies Panchang;

describe("panchang components", () => {
  it("renders five panchang elements and sun times", () => {
    render(
      <>
        <PanchangCard panchang={sample} />
        <SunTimes sunrise={sample.sunrise} sunset={sample.sunset} />
      </>,
    );

    expect(screen.getByText("Shukla Panchami")).toBeTruthy();
    expect(screen.getByText("Rohini")).toBeTruthy();
    expect(screen.getByText("Vishkambha")).toBeTruthy();
    expect(screen.getByText("Bava")).toBeTruthy();
    expect(screen.getByText("Saturday")).toBeTruthy();
    expect(screen.getByText("12:30")).toBeTruthy();
  });

  it("renders the four MVP muhurta windows", () => {
    render(<MuhurtaTimeline sunrise={sample.sunrise} sunset={sample.sunset} windows={sample.muhurta_windows} />);

    expect(screen.getByText("Abhijit Muhurta")).toBeTruthy();
    expect(screen.getByText("Rahu Kaal")).toBeTruthy();
    expect(screen.getByText("Yamaganda")).toBeTruthy();
    expect(screen.getByText("Gulika Kaal")).toBeTruthy();
  });

  it("renders a dashboard strip linking to panchang", () => {
    render(<DashboardPanchangStrip panchang={sample} />);

    expect(screen.getByText(/Today's panchang/)).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/panchang");
  });
});
