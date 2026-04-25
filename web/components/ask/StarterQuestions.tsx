"use client";

import React from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StarterQuestions({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect(question: string): void;
}) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
        Starter questions
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <Button key={question} onClick={() => onSelect(question)} size="sm" type="button" variant="outline">
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
