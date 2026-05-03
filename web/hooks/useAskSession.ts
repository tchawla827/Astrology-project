"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { AskUiMessage } from "@/components/ask/ThreadView";
import {
  AskAnswerSchema,
  DepthModeSchema,
  LlmMetadataSchema,
  ToneModeSchema,
  type DepthMode,
  type ToneMode,
} from "@/lib/schemas";
import type { AskThreadMessage } from "@/lib/server/loadAsk";

type AskApiResponse = {
  answer?: unknown;
  llm_metadata?: unknown;
  session_id?: string;
  assistant_message_id?: string;
  error?: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseAskResponse(response: Response): Promise<AskApiResponse> {
  const body = (await response.json().catch(() => ({}))) as AskApiResponse;
  if (!response.ok) {
    throw new Error(body.error ?? "Ask Astrology failed.");
  }
  return body;
}

export function useAskSession(input: {
  initialSessionId?: string;
  initialMessages?: AskThreadMessage[];
  initialTone: ToneMode;
  initialDepth?: DepthMode;
  profileId?: string;
  dayContextDate?: string;
  navigateOnNewSession?: boolean;
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(input.initialSessionId);
  const [messages, setMessages] = useState<AskUiMessage[]>(input.initialMessages ?? []);
  const [tone, setTone] = useState<ToneMode>(ToneModeSchema.parse(input.initialTone));
  const [depth, setDepth] = useState<DepthMode>(DepthModeSchema.parse(input.initialDepth ?? "simple"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendQuestion = useCallback(
    async (question: string, replaceErrorId?: string) => {
      const trimmed = question.trim();
      if (trimmed.length < 3 || isSubmitting) {
        return;
      }

      const pendingId = makeId("pending");
      const pendingMessage: AskUiMessage = { id: pendingId, role: "pending", question: trimmed };

      if (replaceErrorId) {
        setMessages((current) =>
          current.map((message) => (message.id === replaceErrorId ? pendingMessage : message)),
        );
      } else {
        const userMessage: AskUiMessage = {
          id: makeId("user"),
          ask_session_id: sessionId ?? "pending-session",
          role: "user",
          content: trimmed,
          created_at: new Date().toISOString(),
        };
        setMessages((current) => [...current, userMessage, pendingMessage]);
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            tone,
            depth,
            session_id: sessionId,
            profile_id: input.profileId,
            day_context: input.dayContextDate ? { date: input.dayContextDate } : undefined,
          }),
        });
        const body = await parseAskResponse(response);
        const answer = AskAnswerSchema.parse(body.answer);
        const metadata = LlmMetadataSchema.parse(body.llm_metadata);
        const nextSessionId = body.session_id ?? sessionId;

        if (!nextSessionId) {
          throw new Error("Ask response did not include a session id.");
        }

        const assistantMessage: AskUiMessage = {
          id: body.assistant_message_id ?? makeId("assistant"),
          ask_session_id: nextSessionId,
          role: "assistant",
          content_structured: answer,
          llm_metadata: metadata,
          created_at: new Date().toISOString(),
        };

        setMessages((current) => current.map((message) => (message.id === pendingId ? assistantMessage : message)));

        if (!sessionId) {
          setSessionId(nextSessionId);
          if (input.navigateOnNewSession !== false) {
            const suffix = input.dayContextDate ? `?day=${encodeURIComponent(input.dayContextDate)}` : "";
            router.replace(`/ask/${nextSessionId}${suffix}`);
          }
        }
      } catch (error) {
        const errorMessage: AskUiMessage = {
          id: replaceErrorId ?? makeId("error"),
          role: "error",
          question: trimmed,
          error: error instanceof Error ? error.message : "Ask Astrology failed.",
        };
        setMessages((current) => current.map((message) => (message.id === pendingId ? errorMessage : message)));
      } finally {
        setIsSubmitting(false);
      }
    },
    [depth, input.dayContextDate, input.navigateOnNewSession, input.profileId, isSubmitting, router, sessionId, tone],
  );

  const retryQuestion = useCallback(
    (messageId: string, question: string) => {
      void sendQuestion(question, messageId);
    },
    [sendQuestion],
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
    retryQuestion,
  };
}
