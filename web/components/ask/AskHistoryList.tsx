import React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AskSessionSummary } from "@/lib/server/loadAsk";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function AskHistoryList({ sessions }: { sessions: AskSessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Prior Ask sessions will appear here after your first question.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Link
          className="block rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
          href={`/ask/${session.id}`}
          key={session.id}
        >
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge className="capitalize text-muted-foreground">{session.topic}</Badge>
            <Badge className="capitalize text-muted-foreground">{session.tone_mode}</Badge>
            {session.context_kind === "daily" && session.context_date ? (
              <Badge className="text-muted-foreground">Day {session.context_date}</Badge>
            ) : null}
          </div>
          <p className="line-clamp-2 text-sm font-medium">{session.first_question_preview}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(session.last_updated)}</p>
        </Link>
      ))}
    </div>
  );
}
