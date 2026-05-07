import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePicker } from "@/components/daily/DatePicker";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("Daily DatePicker", () => {
  afterEach(() => {
    cleanup();
    push.mockClear();
  });

  it("routes to the selected calendar date with the current tone", () => {
    render(
      <DatePicker
        date="2026-04-25"
        max="2115-06-07"
        min="1995-06-07"
        todayDate="2026-04-25"
        tone="direct"
      />,
    );

    fireEvent.click(screen.getByLabelText("Open daily date picker"));
    fireEvent.change(screen.getByLabelText("Daily month"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Daily year"), { target: { value: "2026" } });
    fireEvent.click(screen.getByLabelText("Select May 7, 2026"));

    expect(push).toHaveBeenCalledWith("/daily/2026-05-07?tone=direct");
  });
});
