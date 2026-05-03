"use client";

import React from "react";
import { useMemo, useState } from "react";
import { Brain, Clock3, Gem, LockKeyhole, MessageSquareText, ShieldCheck } from "lucide-react";

import { AskHistoryList } from "@/components/ask/AskHistoryList";
import { DepthToggle } from "@/components/ask/DepthToggle";
import { QuestionInput } from "@/components/ask/QuestionInput";
import { StarterQuestions } from "@/components/ask/StarterQuestions";
import { ThreadView } from "@/components/ask/ThreadView";
import { ToneSelector } from "@/components/ask/ToneSelector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAskSession } from "@/hooks/useAskSession";
import type { DepthMode, ToneMode } from "@/lib/schemas";
import type { AskSessionSummary, AskThreadMessage } from "@/lib/server/loadAsk";

type AskQuotaView = {
  allowed: boolean;
  tier: "free" | "premium";
  used: number;
  limit: number | null;
  remaining: number | null;
};

const contextChips = ["D1", "D9", "Moon", "Bhava", "D10", "Dasha", "Transits"];

const advisoryNotes = [
  {
    icon: ShieldCheck,
    label: "Answer confidence",
    copy: "Every completed answer shows a confidence level and the note behind it.",
  },
  {
    icon: Clock3,
    label: "Timing relevance",
    copy: "Responses distinguish long-period dasha pressure from shorter transit windows.",
  },
  {
    icon: Brain,
    label: "Why this answer?",
    copy: "Open the reasoning panel inside an answer to inspect charts, houses, planets, and provider metadata.",
  },
];

export function AskWorkspace({
  profileId,
  initialSessionId,
  initialMessages,
  initialTone,
  initialQuestion,
  dayContextDate,
  starterQuestions,
  sessions,
  quota,
}: {
  profileId: string;
  initialSessionId?: string;
  initialMessages?: AskThreadMessage[];
  initialTone: ToneMode;
  initialQuestion?: string;
  dayContextDate?: string;
  starterQuestions: string[];
  sessions: AskSessionSummary[];
  quota?: AskQuotaView;
}) {
  const [draft, setDraft] = useState(initialQuestion ?? "");
  const ask = useAskSession({
    profileId,
    initialSessionId,
    initialMessages,
    initialTone,
    dayContextDate,
  });

  const hasMessages = ask.messages.length > 0;
  const centeredEmptyState = !hasMessages && sessions.length === 0;
  const inputPanel = (
    <div className="luxury-panel space-y-4 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Advisory mode</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dayContextDate ? `Follow-ups stay scoped to ${dayContextDate}.` : "Choose tone and depth before sending."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToneSelector disabled={ask.isSubmitting} onChange={ask.setTone} value={ask.tone} />
          <DepthToggle disabled={ask.isSubmitting} onChange={ask.setDepth as (value: DepthMode) => void} value={ask.depth} />
        </div>
      </div>
      <QuestionInput
        disabled={ask.isSubmitting || quota?.allowed === false}
        isSubmitting={ask.isSubmitting}
        onChange={setDraft}
        onSubmit={() => {
          const question = draft;
          setDraft("");
          void ask.sendQuestion(question);
        }}
        value={draft}
      />
      {quota?.tier === "free" && quota.limit !== null ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
          {quota.allowed ? (
            <p>
              {quota.remaining} of {quota.limit} free Ask questions remain this month.
            </p>
          ) : (
            <p>Ask is temporarily unavailable.</p>
          )}
        </div>
      ) : null}
    </div>
  );

  const history = useMemo(() => <AskHistoryList sessions={sessions} />, [sessions]);

  return (
    <div className="space-y-6">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <div className="flex items-center gap-3 text-primary">
            <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm uppercase tracking-[0.24em]">Ask AI</p>
          </div>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-tight sm:text-6xl">Private chart advisory</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            Ask about career, timing, relationships, money, health, family, spirituality, or the pattern you keep meeting. Answers stay grounded in your stored chart snapshot.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <section className="min-w-0 space-y-5">
          {centeredEmptyState ? (
            <div className="mx-auto max-w-4xl space-y-5">
              {inputPanel}
              <div className="rounded-lg border border-primary/15 bg-card/70 p-5">
                <StarterQuestions questions={starterQuestions} onSelect={setDraft} />
              </div>
            </div>
          ) : (
            <>
              {hasMessages ? (
                <ThreadView
                  depth={ask.depth}
                  messages={ask.messages}
                  onFollowUp={setDraft}
                  onRetry={ask.retryQuestion}
                  tone={ask.tone}
                />
              ) : (
                <Card className="border-primary/20 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-2xl">Start a new advisory session</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StarterQuestions questions={starterQuestions} onSelect={setDraft} />
                  </CardContent>
                </Card>
              )}
              <div className="sticky bottom-0 z-10 border-t border-primary/15 bg-background/90 py-4 backdrop-blur">{inputPanel}</div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <div className="luxury-panel rounded-lg p-5">
            <div className="flex items-center gap-3 text-primary">
              <Gem className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">Chart context</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {contextChips.map((chip) => (
                <Badge className="border-primary/25 bg-primary/10 text-primary" key={chip}>
                  {chip}
                </Badge>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Context chips show the chart lenses the advisory layer is designed to cite when relevant.
            </p>
          </div>

          <div className="grid gap-3">
            {advisoryNotes.map((note) => {
              const Icon = note.icon;
              return (
                <div className="rounded-lg border border-primary/15 bg-card/70 p-4" key={note.label}>
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{note.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.copy}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-primary/20 bg-background/55 p-5">
            <div className="flex items-center gap-3 text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">History</h2>
            </div>
            <div className="mt-4">{history}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
