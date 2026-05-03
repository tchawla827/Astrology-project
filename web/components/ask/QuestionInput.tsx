"use client";

import React from "react";
import { LoaderCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuestionInput({
  value,
  onChange,
  onSubmit,
  disabled,
  isSubmitting,
  className,
  placeholder = "Ask about career, timing, relationships, money, health, or the pattern you keep repeating.",
}: {
  value: string;
  onChange(value: string): void;
  onSubmit(): void;
  disabled?: boolean;
  isSubmitting?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <form
      className={cn("space-y-3", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="ask-question">
        Ask a question
      </label>
      <div className="flex gap-2 rounded-lg border border-primary/20 bg-card/80 p-2">
        <textarea
          className="min-h-24 flex-1 resize-none rounded-md bg-background/80 px-3 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          disabled={disabled}
          id="ask-question"
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
        <Button
          aria-label={isSubmitting ? "Predicting answer" : "Submit question"}
          className="min-w-28 gap-2 self-end"
          disabled={disabled || value.trim().length < 3}
          size="sm"
          type="submit"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Predicting
            </>
          ) : (
            <>
              <Send aria-hidden="true" className="h-4 w-4" />
              Ask
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
