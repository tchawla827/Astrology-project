import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SouthIndianChart } from "@/components/charts/SouthIndianChart";
import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { renderChart } from "@/lib/charts/renderChart";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const refresh = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("chart explorer controls", () => {
  beforeEach(() => {
    refresh.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("starts regeneration from the chart explorer and refreshes the route", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(<RegenerateChartButton profileId="profile-123" />);

    fireEvent.click(screen.getByRole("button", { name: /Recompute chart/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/profile/profile-123/regenerate", { method: "POST" }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("shows nakshatra and pada in South Indian technical mode", () => {
    const rendered = renderChart(goldenSnapshot, "D1", "south");
    expect(rendered).toBeTruthy();

    render(<SouthIndianChart depth="technical" rendered={rendered!} />);

    expect(screen.getByText(/48\.9 Roh-3/)).toBeTruthy();
  });
});
