import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlaceAutocomplete } from "@/components/onboarding/PlaceAutocomplete";

describe("PlaceAutocomplete", () => {
  it("selects a place result with coordinates, timezone, and country-level warning", async () => {
    const onSelect = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "1",
              label: "Panipat, Haryana, India",
              latitude: 29.3909,
              longitude: 76.9635,
              timezone: "Asia/Kolkata",
            },
            {
              id: "2",
              label: "India",
              latitude: 20.5937,
              longitude: 78.9629,
              timezone: "Asia/Kolkata",
              warning: "This is a broad country-level match. Choose a city when possible.",
            },
          ],
        }),
      }))
    );

    render(<PlaceAutocomplete onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("Birth place"), { target: { value: "Panipat" } });
    fireEvent.click(screen.getByLabelText("Search places"));
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
    fireEvent.click(screen.getByLabelText("Search places"));
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
