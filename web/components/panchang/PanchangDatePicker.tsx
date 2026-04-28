"use client";

import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useEffect, useState, useTransition } from "react";

import { InlineLoading } from "@/components/common/LoadingState";

export function PanchangDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [draftDate, setDraftDate] = useState(date);
  const [isPending, startTransition] = useTransition();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    setDraftDate(date);
    setPendingLabel(null);
  }, [date, query]);

  function routeTo(nextDate: string) {
    if (!nextDate || nextDate === date) {
      return;
    }
    setPendingLabel(`Calculating panchang for ${nextDate}...`);
    startTransition(() => {
      router.push(`/panchang/${nextDate}${query ? `?${query}` : ""}`);
    });
  }

  const isRouting = isPending || pendingLabel !== null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-lg border bg-background p-4 text-sm font-medium">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
        <input
          className="h-9 rounded-md border bg-background px-3 text-sm"
          disabled={isRouting}
          onBlur={() => routeTo(draftDate)}
          onChange={(event) => setDraftDate(event.target.value)}
          type="date"
          value={draftDate}
        />
      </label>
      {isRouting ? <InlineLoading label={pendingLabel ?? "Calculating panchang..."} /> : null}
    </div>
  );
}
