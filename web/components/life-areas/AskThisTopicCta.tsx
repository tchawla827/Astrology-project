import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Topic, ToneMode } from "@/lib/schemas";

export function AskThisTopicCta({ topic, tone }: { topic: Topic; tone: ToneMode }) {
  const href = `/ask?topic=${topic}&tone=${tone}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3 text-primary">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs uppercase tracking-[0.18em]">Advisory handoff</p>
        </div>
        <CardTitle className="text-2xl">Ask this topic</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">Carry this report into Ask for a sharper question on {topic}. The same chart room, timing lens, and default tone will stay attached.</p>
        <Button asChild>
          <Link href={href}>
            Ask about your {topic}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
