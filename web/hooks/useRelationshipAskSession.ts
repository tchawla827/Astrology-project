"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { AskUiMessage } from "@/components/ask/ThreadView";
import { AskAnswerSchema, DepthModeSchema, LlmMetadataSchema, ToneModeSchema, type DepthMode, type ToneMode } from "@/lib/schemas";
import type { RelationshipAskThreadMessage } from "@/lib/server/loadRelationships";

type RelationshipAskApiResponse = {
  answer?: unknown;
  llm_metadata?: unknown;
  session_id?: string;
  assistant_message_id?: string;
  error?: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseResponse(response: Response): Promise<RelationshipAskApiResponse> {
  const body = (await response.json().catch(() => ({}))) as RelationshipAskApiResponse;
  if (!response.ok) {
    throw new Error(body.error ?? "Relationship Ask failed.");
  }
  return body;
}

export function useRelationshipAskSession(input: {
  relationshipId: string;
  initialSessionId?: string;
  initialMessages?: RelationshipAskThreadMessage[];
  initialTone: ToneMode;
  initialDepth?: DepthMode;
  dayContextDate?: string;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(input.initialSessionId);
  const [messages, setMessages] = useState<AskUiMessage[]>((input.initialMessages ?? []).map((message) => {
    if (message.role === "user") {
      return {
        id: message.id,
        ask_session_id: message.relationship_ask_session_id,
        role: "user" as const,
        content: message.content,
        created_at: message.created_at,
      };
    }
    return {
      id: message.id,
      ask_session_id: message.relationship_ask_session_id,
      role: "assistant" as const,
      content_structured: message.content_structured,
      llm_metadata: message.llm_metadata,
      created_at: message.created_at,
    };
  }));
  const [tone, setTone] = useState<ToneMode>(ToneModeSchema.parse(input.initialTone));
  const [depth, setDepth] = useState<DepthMode>(DepthModeSchema.parse(input.initialDepth ?? "simple"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendQuestion = useCallback(
    async (question: string, replaceErrorId?: string) => {
      const trimmed = question.trim();
      if (trimmed.length < 3 || isSubmitting) {
        return;
      }
      const pendingId = makeId("relationship-pending");
      const pendingMessage: AskUiMessage = { id: pendingId, role: "pending", question: trimmed };
      if (replaceErrorId) {
        setMessages((current) => current.map((message) => (message.id === replaceErrorId ? pendingMessage : message)));
      } else {
        setMessages((current) => [
          ...current,
          {
            id: makeId("relationship-user"),
            ask_session_id: sessionId ?? "pending-session",
            role: "user",
            content: trimmed,
            created_at: new Date().toISOString(),
          },
          pendingMessage,
        ]);
      }

      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/relationships/${input.relationshipId}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            tone,
            depth,
            session_id: sessionId,
            day_context: input.dayContextDate ? { date: input.dayContextDate } : undefined,
          }),
        });
        const body = await parseResponse(response);
        const answer = AskAnswerSchema.parse(body.answer);
        const metadata = LlmMetadataSchema.parse(body.llm_metadata);
        const nextSessionId = body.session_id ?? sessionId;
        if (!nextSessionId) {
          throw new Error("Relationship Ask response did not include a session id.");
        }
        const assistantMessage: AskUiMessage = {
          id: body.assistant_message_id ?? makeId("relationship-assistant"),
          ask_session_id: nextSessionId,
          role: "assistant",
          content_structured: answer,
          llm_metadata: metadata,
          created_at: new Date().toISOString(),
        };
        setMessages((current) => current.map((message) => (message.id === pendingId ? assistantMessage : message)));
        if (!sessionId) {
          setSessionId(nextSessionId);
          router.refresh();
        }
      } catch (error) {
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId
              ? {
                  id: replaceErrorId ?? makeId("relationship-error"),
                  role: "error",
                  question: trimmed,
                  error: error instanceof Error ? error.message : "Relationship Ask failed.",
                }
              : message,
          ),
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [depth, input.dayContextDate, input.relationshipId, isSubmitting, router, sessionId, tone],
  );

  return {
    sessionId,
    messages,
    tone,
    setTone,
    depth,
    setDepth,
    isSubmitting,
    sendQuestion,
    retryQuestion: (messageId: string, question: string) => {
      void sendQuestion(question, messageId);
    },
  };
}
