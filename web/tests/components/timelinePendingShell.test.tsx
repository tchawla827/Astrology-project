import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TimelinePendingShell } from "@/components/timeline/TimelinePendingShell";

describe("TimelinePendingShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a loading overlay while timeline search params are changing", () => {
    const view = render(
      <TimelinePendingShell routeKey="career:2027:5">
        <a href="/timeline?area=career&year=2027&month=6" onClick={(event) => event.preventDefault()}>
          Jun
        </a>
      </TimelinePendingShell>,
    );

    fireEvent.click(screen.getByText("Jun"));

    expect(screen.getByRole("status").textContent).toContain("Calculating Career timing for Jun 2027");

    view.rerender(
      <TimelinePendingShell routeKey="career:2027:6">
        <a href="/timeline?area=career&year=2027&month=6" onClick={(event) => event.preventDefault()}>
          Jun
        </a>
      </TimelinePendingShell>,
    );

    expect(screen.queryByRole("status")).toBeNull();
  });
});
