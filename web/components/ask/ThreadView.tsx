"use client";

import React from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import { AnswerCard } from "@/components/ask/AnswerCard";
import { FollowUpSuggestions } from "@/components/ask/FollowUpSuggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DepthMode, ToneMode } from "@/lib/schemas";
import type { AskThreadMessage } from "@/lib/server/loadAsk";

export type AskUiMessage =
  | AskThreadMessage
  | { id: string; role: "pending"; question: string }
  | { id: string; role: "error"; question: string; error: string };

export function ThreadView({
  messages,
  tone,
  depth,
  onFollowUp,
  onRetry,
}: {
  messages: AskUiMessage[];
  tone: ToneMode;
  depth: DepthMode;
  onFollowUp(question: string): void;
  onRetry(messageId: string, question: string): void;
}) {
  const lastAssistantIndex = messages.findLastIndex((message) => message.role === "assistant");

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        if (message.role === "user") {
          return (
            <div className="flex justify-end" key={message.id}>
              <div className="max-w-2xl rounded-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                {message.content}
              </div>
            </div>
          );
        }

        if (message.role === "assistant") {
          return (
            <div className="space-y-3" key={message.id}>
              <AnswerCard answer={message.content_structured} messageId={message.id} metadata={message.llm_metadata} />
              {index === lastAssistantIndex ? <FollowUpSuggestions depth={depth} onSelect={onFollowUp} tone={tone} /> : null}
            </div>
          );
        }

        if (message.role === "pending") {
          return (
            <Card key={message.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-primary" role="status" aria-live="polite">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Predicting answer from your chart context...
                </div>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          );
        }

        return (
          <Card className="border-destructive/60" key={message.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Ask Astrology could not answer that.</p>
                  <p className="mt-1 text-sm text-muted-foreground">{message.error}</p>
                </div>
              </div>
              <Button onClick={() => onRetry(message.id, message.question)} size="sm" type="button" variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
