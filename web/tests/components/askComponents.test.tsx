import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnswerCard } from "@/components/ask/AnswerCard";
import { AskHistoryList } from "@/components/ask/AskHistoryList";
import { FollowUpSuggestions } from "@/components/ask/FollowUpSuggestions";
import { StarterQuestions } from "@/components/ask/StarterQuestions";
import type { AskAnswer } from "@/lib/schemas";
import type { AskSessionSummary } from "@/lib/server/loadAsk";

const answer: AskAnswer = {
  verdict: "Career pressure is real, but it is structured rather than random.",
  explanation:
    "The chart does not describe the pressure as meaningless chaos. It points to a work pattern that demands patience, consistency, and better structure. That makes the period uncomfortable, but still usable.",
  advice: ["Prioritize durable work over quick recognition.", "Do not change direction just to escape pressure."],
  why: ["Saturn is tied to the 10th house.", "The current dasha keeps work themes active."],
  timing: { summary: "This is mainly a dasha-led period with transit pressure.", type: ["dasha", "transit"] },
  confidence: { level: "medium", note: "Grounded in D1 and timing factors." },
  technical_basis: { charts_used: ["D1", "D10"], houses_used: [10], planets_used: ["Saturn"] },
};

describe("Ask components", () => {
  afterEach(() => cleanup());

  it("renders structured answer sections and collapsed reasoning details", () => {
    render(<AnswerCard answer={answer} />);

    expect(screen.getByText("Verdict")).toBeTruthy();
    expect(screen.getByText(answer.verdict)).toBeTruthy();
    expect(screen.getByText(answer.explanation)).toBeTruthy();
    expect(screen.getByText("What to do")).toBeTruthy();
    expect(screen.getByText("Why")).toBeTruthy();
    expect(screen.getAllByText("Timing").length).toBeGreaterThan(0);
    expect(screen.getByText("Confidence")).toBeTruthy();
    expect(screen.getByText("Show reasoning")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Share/i })).toHaveProperty("disabled", true);
  });

  it("enables sharing when an assistant message id is available", () => {
    render(<AnswerCard answer={answer} messageId="00000000-0000-4000-8000-000000000001" />);

    expect(screen.getByRole("button", { name: /Share/i })).toHaveProperty("disabled", false);
  });

  it("expands transparency factors from technical basis", () => {
    render(<AnswerCard answer={answer} />);

    fireEvent.click(screen.getByText("Show reasoning"));

    expect(screen.getByText("Based on charts")).toBeTruthy();
    expect(screen.getByText("D1")).toBeTruthy();
    expect(screen.getByText("D10")).toBeTruthy();
    expect(screen.getByText("10: cited")).toBeTruthy();
    expect(screen.getAllByText(/Saturn/).length).toBeGreaterThan(0);
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

  it("keeps Ask history inside a scroll container", () => {
    const sessions: AskSessionSummary[] = Array.from({ length: 12 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      birth_profile_id: "00000000-0000-4000-8000-000000000101",
      topic: "career",
      tone_mode: "direct",
      depth: "simple",
      context_kind: "natal",
      first_question_preview: `Question ${index + 1}`,
      created_at: "2026-05-13T00:00:00.000Z",
      last_updated: "2026-05-13T00:00:00.000Z",
    }));

    render(<AskHistoryList sessions={sessions} />);

    const scrollRegion = screen.getByTestId("ask-history-scroll");
    expect(scrollRegion.className).toContain("overflow-y-auto");
    expect(scrollRegion.className).toContain("max-h-");
    expect(screen.getByText("Question 12")).toBeTruthy();
  });
});
