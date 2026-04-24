import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Topic, ToneMode } from "@/lib/schemas";

export function AskThisTopicCta({ topic, tone }: { topic: Topic; tone: ToneMode }) {
  const href = `/ask?topic=${topic}&tone=${tone}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ask this topic</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Carry this report into Ask for a sharper question on {topic}.</p>
        <Button asChild>
          <Link href={href}>Ask about your {topic} -&gt;</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
