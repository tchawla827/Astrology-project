import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BirthDatePicker } from "@/components/onboarding/BirthDatePicker";

afterEach(() => {
  cleanup();
});

describe("BirthDatePicker", () => {
  it("selects a birth date from the calendar panel", () => {
    const onChange = vi.fn();

    render(<BirthDatePicker id="birth-date" onChange={onChange} required value="" />);

    fireEvent.click(screen.getByLabelText("Open birth date picker"));
    fireEvent.change(screen.getByLabelText("Birth month"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Birth year"), { target: { value: "1995" } });
    fireEvent.click(screen.getByLabelText("Select May 16, 1995"));

    expect(onChange).toHaveBeenCalledWith("1995-05-16");
  });

  it("keeps typed date input wired to the parent value", () => {
    const onChange = vi.fn();

    render(<BirthDatePicker id="birth-date" onChange={onChange} value="1995-05-16" />);

    fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "1995-05-17" } });

    expect(onChange).toHaveBeenCalledWith("1995-05-17");
  });
});
