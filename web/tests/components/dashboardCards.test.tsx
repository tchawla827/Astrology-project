import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BirthTimeBanner } from "@/components/common/BirthTimeBanner";
import { FocusCard } from "@/components/insights/FocusCard";

describe("dashboard cards", () => {
  it("shows the birth-time banner only for non-exact profiles", () => {
    const exact = render(<BirthTimeBanner confidence="exact" />);
    expect(exact.queryByText(/Time-sensitive insights/)).toBeNull();
    exact.unmount();

    render(<BirthTimeBanner confidence="unknown" />);
    expect(screen.getByText(/Time-sensitive insights/)).toBeTruthy();
  });

  it("opens a chart basis dialog with snapshot-derived houses and planets", () => {
    render(
      <FocusCard
        focus={{
          id: "transit-focus",
          title: "Current transit focus",
          body: "Saturn over natal 10th house",
          why: { charts: ["D1", "Transit"], houses: [10], planets: ["Saturn"] },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Why?" }));

    expect(screen.getByText("Chart basis")).toBeTruthy();
    expect(screen.getByText("D1, Transit")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("Saturn")).toBeTruthy();
  });
});
