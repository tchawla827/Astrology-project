"use client";

import { CalendarDays, Copy, HeartHandshake, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { DepthToggle } from "@/components/ask/DepthToggle";
import { QuestionInput } from "@/components/ask/QuestionInput";
import { ThreadView } from "@/components/ask/ThreadView";
import { ToneSelector } from "@/components/ask/ToneSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRelationshipAskSession } from "@/hooks/useRelationshipAskSession";
import { labelText } from "@/lib/relationships/labels";
import type { RelationshipAskSessionSummary, RelationshipSummary } from "@/lib/server/loadRelationships";
import type { RelationshipFactor, RelationshipInsight, ToneMode } from "@/lib/schemas";

function FactorList({ title, factors }: { title: string; factors: RelationshipFactor[] }) {
  return (
    <Card className="border-primary/20 bg-card/70">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {factors.length > 0 ? (
          factors.map((factor) => (
            <div className="rounded-lg border border-primary/15 bg-background/50 p-4" key={`${factor.category}:${factor.title}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="capitalize">{factor.polarity}</Badge>
                <span className="text-xs uppercase tracking-[0.16em] text-primary">{factor.category}</span>
              </div>
              <h3 className="mt-3 font-semibold">{factor.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{factor.summary}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No factors in this group yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RelationshipWorkspace({
  relationship,
  insight,
  sessions,
  defaultTone,
}: {
  relationship: RelationshipSummary;
  insight?: RelationshipInsight;
  sessions: RelationshipAskSessionSummary[];
  defaultTone: ToneMode;
}) {
  const router = useRouter();
  const latestSession = sessions[0];
  const [draft, setDraft] = useState("");
  const [date, setDate] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ask = useRelationshipAskSession({
    relationshipId: relationship.id,
    initialSessionId: latestSession?.id,
    initialMessages: latestSession?.messages,
    initialTone: latestSession?.tone_mode ?? defaultTone,
    initialDepth: latestSession?.depth,
    dayContextDate: date || latestSession?.context_date,
  });

  async function regenerateInsight() {
    setIsRegenerating(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/relationships/${relationship.id}/insights`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not regenerate relationship insight.");
        return;
      }
      setStatus("Relationship insight refreshed.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not regenerate relationship insight.");
    } finally {
      setIsRegenerating(false);
    }
  }

  async function copyPrivateLink() {
    await navigator.clipboard.writeText(window.location.href);
    setStatus("Private relationship link copied.");
  }

  return (
    <div className="space-y-6">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <div className="flex items-center gap-3 text-primary">
            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm uppercase tracking-[0.24em]">Relationship workspace</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">{relationship.other_name}</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {labelText(relationship.self_label)} / {labelText(relationship.other_label)}
          </p>
          {insight ? <p className="mt-5 max-w-3xl text-base leading-7">{insight.verdict}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="gap-2" disabled={isRegenerating} onClick={() => void regenerateInsight()} type="button">
              {isRegenerating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Refresh insight
            </Button>
            <Button className="gap-2" onClick={() => void copyPrivateLink()} type="button" variant="outline">
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy private link
            </Button>
          </div>
        </div>
      </section>

      {status ? <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">{status}</p> : null}
      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      {insight ? (
        <>
          <Card className="border-primary/20 bg-card/70">
            <CardHeader>
              <CardTitle>Compatibility read</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{insight.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="capitalize">{insight.confidence.level} confidence</Badge>
                <span className="text-sm text-muted-foreground">{insight.confidence.note}</span>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-5 lg:grid-cols-3">
            <FactorList title="Strengths" factors={insight.strengths} />
            <FactorList title="Frictions" factors={insight.frictions} />
            <FactorList title="All factors" factors={insight.categories} />
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Relationship insight is not ready</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Refresh the insight once both charts are ready.</p>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {ask.messages.length > 0 ? (
            <ThreadView
              depth={ask.depth}
              messages={ask.messages}
              onFollowUp={setDraft}
              onRetry={ask.retryQuestion}
              shareEnabled={false}
              tone={ask.tone}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Ask about this relationship</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ask with both charts, the relationship insight, and optional selected-date transits.
                </p>
              </CardContent>
            </Card>
          )}
          <div className="sticky bottom-0 z-10 space-y-3 border-t border-primary/15 bg-background/90 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                <input
                  aria-label="Selected relationship date"
                  className="h-10 rounded-md border border-primary/20 bg-background px-3 text-sm"
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  value={date}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <ToneSelector disabled={ask.isSubmitting} onChange={ask.setTone} value={ask.tone} />
                <DepthToggle disabled={ask.isSubmitting} onChange={ask.setDepth} value={ask.depth} />
              </div>
            </div>
            <QuestionInput
              disabled={ask.isSubmitting}
              isSubmitting={ask.isSubmitting}
              onChange={setDraft}
              onSubmit={() => {
                const question = draft;
                setDraft("");
                void ask.sendQuestion(question);
              }}
              placeholder="Ask about compatibility, timing, friction, repair, boundaries, or what this bond needs now."
              value={draft}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="border-primary/20 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Shared access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Relationship Ask threads are shared between accepted participants. Full chart browsing remains private.
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Ask history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div className="rounded-md border border-primary/15 bg-background/50 p-3" key={session.id}>
                    <p className="line-clamp-2 text-sm">{session.first_question_preview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(session.last_updated).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No relationship Ask threads yet.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
