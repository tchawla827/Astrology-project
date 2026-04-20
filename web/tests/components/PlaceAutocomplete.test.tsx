import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlaceAutocomplete } from "@/components/onboarding/PlaceAutocomplete";

describe("PlaceAutocomplete", () => {
  it("selects a Mapbox result with coordinates, timezone, and country-level warning", async () => {
    const onSelect = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          features: [
            {
              id: "place.1",
              place_name: "Panipat, Haryana, India",
              center: [76.9635, 29.3909],
              place_type: ["place"],
            },
            {
              id: "country.1",
              place_name: "India",
              center: [78.9629, 20.5937],
              place_type: ["country"],
            },
          ],
        }),
      }))
    );

    render(<PlaceAutocomplete mapboxToken="token" onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("Birth place"), { target: { value: "Panipat" } });
    await waitFor(() => expect(screen.getByText("Panipat, Haryana, India")).toBeTruthy());
    fireEvent.click(screen.getByText("Panipat, Haryana, India"));

    expect(onSelect).toHaveBeenCalledWith({
      label: "Panipat, Haryana, India",
      latitude: 29.3909,
      longitude: 76.9635,
      timezone: "Asia/Kolkata",
      warning: undefined,
    });

    fireEvent.change(screen.getByLabelText("Birth place"), { target: { value: "India" } });
    await waitFor(() => expect(screen.getByText("India")).toBeTruthy());
    fireEvent.click(screen.getByText("India"));

    expect(onSelect).toHaveBeenLastCalledWith({
      label: "India",
      latitude: 20.5937,
      longitude: 78.9629,
      timezone: "Asia/Kolkata",
      warning: "This is a broad country-level match. Choose a city when possible.",
    });
  });
});
