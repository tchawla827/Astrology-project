import * as React from "react";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AskCtaCard({ questions }: { questions: string[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircleQuestion className="h-4 w-4 text-primary" aria-hidden="true" />
          Ask Astrology
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Start with a question shaped by this chart snapshot.</p>
        <div className="grid gap-2">
          {questions.map((question) => (
            <Link
              className="rounded-md border bg-background/40 p-3 text-sm transition-colors hover:bg-muted"
              href={`/ask?q=${encodeURIComponent(question)}`}
              key={question}
            >
              {question}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
