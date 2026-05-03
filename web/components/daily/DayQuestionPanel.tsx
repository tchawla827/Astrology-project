"use client";

import { useState } from "react";
import { CalendarDays, MessageSquareText } from "lucide-react";

import { DepthToggle } from "@/components/ask/DepthToggle";
import { QuestionInput } from "@/components/ask/QuestionInput";
import { ThreadView } from "@/components/ask/ThreadView";
import { ToneSelector } from "@/components/ask/ToneSelector";
import { Button } from "@/components/ui/button";
import { useAskSession } from "@/hooks/useAskSession";
import type { DepthMode, ToneMode } from "@/lib/schemas";

const dayPrompts = ["What is strongest that day?", "How is work on this date?", "What should I avoid?"];

export function DayQuestionPanel({ date, profileId, tone }: { date: string; profileId: string; tone: ToneMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ask = useAskSession({
    profileId,
    initialTone: tone,
    dayContextDate: date,
    navigateOnNewSession: false,
  });

  const hasMessages = ask.messages.length > 0;

  return (
    <div className="rounded-lg border border-primary/20 bg-background/70 p-4">
      <Button className="w-full gap-2" onClick={() => setIsOpen((current) => !current)} type="button" variant="outline">
        <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        {isOpen ? "Close day ask" : "Ask this day"}
      </Button>

      {isOpen ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/15 bg-card/70 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-primary">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <span>{date}</span>
            </div>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Facts attached</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToneSelector disabled={ask.isSubmitting} onChange={ask.setTone} value={ask.tone} />
            <DepthToggle disabled={ask.isSubmitting} onChange={ask.setDepth as (value: DepthMode) => void} value={ask.depth} />
          </div>

          {!hasMessages ? (
            <div className="flex flex-wrap gap-2">
              {dayPrompts.map((prompt) => (
                <Button key={prompt} onClick={() => setDraft(prompt)} size="sm" type="button" variant="secondary">
                  {prompt}
                </Button>
              ))}
            </div>
          ) : null}

          {hasMessages ? (
            <ThreadView
              depth={ask.depth}
              messages={ask.messages}
              onFollowUp={setDraft}
              onRetry={ask.retryQuestion}
              tone={ask.tone}
            />
          ) : null}

          <QuestionInput
            disabled={ask.isSubmitting}
            isSubmitting={ask.isSubmitting}
            onChange={setDraft}
            onSubmit={() => {
              const question = draft;
              setDraft("");
              void ask.sendQuestion(question);
            }}
            placeholder={`Ask about ${date}.`}
            value={draft}
          />
        </div>
      ) : null}
    </div>
  );
}
