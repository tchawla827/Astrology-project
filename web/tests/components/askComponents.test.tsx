import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnswerCard } from "@/components/ask/AnswerCard";
import { FollowUpSuggestions } from "@/components/ask/FollowUpSuggestions";
import { StarterQuestions } from "@/components/ask/StarterQuestions";
import type { AskAnswer } from "@/lib/schemas";

const answer: AskAnswer = {
  verdict: "Career pressure is real, but it is structured rather than random.",
  why: ["Saturn is tied to the 10th house.", "The current dasha keeps work themes active."],
  timing: { summary: "This is mainly a dasha-led period with transit pressure.", type: ["dasha", "transit"] },
  confidence: { level: "medium", note: "Grounded in D1 and timing factors." },
  advice: ["Prioritize durable work over quick recognition.", "Do not change direction just to escape pressure."],
  technical_basis: { charts_used: ["D1", "D10"], houses_used: [10], planets_used: ["Saturn"] },
};

describe("Ask components", () => {
  it("renders structured answer sections and collapsed reasoning details", () => {
    render(<AnswerCard answer={answer} />);

    expect(screen.getByText("Verdict")).toBeTruthy();
    expect(screen.getByText(answer.verdict)).toBeTruthy();
    expect(screen.getByText("Why")).toBeTruthy();
    expect(screen.getByText("Timing")).toBeTruthy();
    expect(screen.getByText("Confidence")).toBeTruthy();
    expect(screen.getByText("What to do")).toBeTruthy();
    expect(screen.getByText("Show reasoning")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Share/i })).toHaveProperty("disabled", true);
  });

  it("lets starter and follow-up chips populate the question draft", () => {
    const onStarter = vi.fn();
    const onFollowUp = vi.fn();

    render(
      <>
        <StarterQuestions questions={["Why has my career felt stuck?"]} onSelect={onStarter} />
        <FollowUpSuggestions depth="simple" onSelect={onFollowUp} tone="direct" />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Why has my career felt stuck?" }));
    fireEvent.click(screen.getByRole("button", { name: "Explain this technically" }));

    expect(onStarter).toHaveBeenCalledWith("Why has my career felt stuck?");
    expect(onFollowUp).toHaveBeenCalledWith("Explain this technically");
  });
});
