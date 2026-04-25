"use client";

import React from "react";
import { useMemo, useState } from "react";

import { AskHistoryList } from "@/components/ask/AskHistoryList";
import { DepthToggle } from "@/components/ask/DepthToggle";
import { QuestionInput } from "@/components/ask/QuestionInput";
import { StarterQuestions } from "@/components/ask/StarterQuestions";
import { ThreadView } from "@/components/ask/ThreadView";
import { ToneSelector } from "@/components/ask/ToneSelector";
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

export function AskWorkspace({
  profileId,
  initialSessionId,
  initialMessages,
  initialTone,
  initialQuestion,
  starterQuestions,
  sessions,
  quota,
}: {
  profileId: string;
  initialSessionId?: string;
  initialMessages?: AskThreadMessage[];
  initialTone: ToneMode;
  initialQuestion?: string;
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
  });

  const hasMessages = ask.messages.length > 0;
  const centeredEmptyState = !hasMessages && sessions.length === 0;
  const inputPanel = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToneSelector disabled={ask.isSubmitting} onChange={ask.setTone} value={ask.tone} />
        <DepthToggle disabled={ask.isSubmitting} onChange={ask.setDepth as (value: DepthMode) => void} value={ask.depth} />
      </div>
      <QuestionInput
        disabled={ask.isSubmitting || quota?.allowed === false}
        onChange={setDraft}
        onSubmit={() => {
          const question = draft;
          setDraft("");
          void ask.sendQuestion(question);
        }}
        value={draft}
      />
      {quota?.tier === "free" && quota.limit !== null ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
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
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <section className="min-w-0 space-y-5">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-primary">Ask Astrology</p>
          <h1 className="text-3xl font-semibold">Ask a chart-aware question</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Answers are grounded in your stored chart snapshot and derived topic bundles.
          </p>
        </div>

        {centeredEmptyState ? (
          <div className="mx-auto max-w-3xl space-y-5 py-8">
            {inputPanel}
            <StarterQuestions questions={starterQuestions} onSelect={setDraft} />
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Start a new Ask session</CardTitle>
                </CardHeader>
                <CardContent>
                  <StarterQuestions questions={starterQuestions} onSelect={setDraft} />
                </CardContent>
              </Card>
            )}
            <div className="sticky bottom-0 z-10 border-t bg-background/95 py-4 backdrop-blur">{inputPanel}</div>
          </>
        )}
      </section>

      <aside className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">History</h2>
        </div>
        {history}
      </aside>
    </div>
  );
}
