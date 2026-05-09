import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepthMode, Topic, ToneMode } from "@/lib/schemas";

export function AskThisTopicCta({
  topic,
  tone,
  depth = "simple",
  questions = [],
}: {
  topic: Topic;
  tone: ToneMode;
  depth?: DepthMode;
  questions?: string[];
}) {
  const href = `/ask?topic=${topic}&tone=${tone}&depth=${depth}`;

  function questionHref(question: string) {
    return `${href}&question=${encodeURIComponent(question)}`;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Advisory handoff</p>
        </div>
        <CardTitle className="text-2xl">Ask this topic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">Carry this report into Ask for a sharper question on {topic}. The same chart room, timing lens, and default tone will stay attached.</p>
          <Button asChild>
            <Link href={href}>
              Ask about your {topic}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {questions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {questions.map((question) => (
              <Button asChild key={question} size="sm" variant="outline">
                <Link href={questionHref(question)}>{question}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
