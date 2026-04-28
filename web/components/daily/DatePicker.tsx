"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { ToneSelector } from "@/components/ask/ToneSelector";
import { InlineLoading } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import type { ToneMode } from "@/lib/schemas";

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function DatePicker({
  date,
  todayDate,
  tone,
  min,
  max,
}: {
  date: string;
  todayDate: string;
  tone: ToneMode;
  min: string;
  max: string;
}) {
  const router = useRouter();
  const [draftDate, setDraftDate] = useState(date);
  const [isPending, startTransition] = useTransition();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  useEffect(() => {
    setDraftDate(date);
    setPendingLabel(null);
  }, [date, tone]);
  const shortcuts = useMemo(
    () => [
      { label: "Today", value: todayDate },
      { label: "Tomorrow", value: addDays(todayDate, 1) },
      { label: "Next week", value: addDays(date, 7) },
      { label: "Next month", value: addDays(date, 30) },
      { label: "Previous week", value: addDays(date, -7) },
    ],
    [date, todayDate],
  );

  function routeTo(nextDate: string, nextTone = tone) {
    if (!nextDate || (nextDate === date && nextTone === tone)) {
      return;
    }
    setDraftDate(nextDate);
    setPendingLabel(`Calculating ${nextDate} prediction...`);
    startTransition(() => {
      router.push(`/daily/${nextDate}?tone=${nextTone}`);
    });
  }

  const isRouting = isPending || pendingLabel !== null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-background/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <input
            className="min-h-11 rounded-md border border-primary/20 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            max={max}
            min={min}
            onChange={(event) => setDraftDate(event.target.value)}
            onBlur={() => routeTo(draftDate)}
            disabled={isRouting}
            type="date"
            value={draftDate}
          />
        </label>
        <ToneSelector disabled={isRouting} value={tone} onChange={(nextTone) => routeTo(draftDate, nextTone)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <Button
            disabled={isRouting || shortcut.value < min || shortcut.value > max}
            key={shortcut.label}
            onClick={() => routeTo(shortcut.value)}
            size="sm"
            type="button"
            variant={shortcut.value === date ? "default" : "outline"}
          >
            {shortcut.label}
          </Button>
        ))}
        <Button disabled size="sm" title="Monthly summaries ship after the MVP." type="button" variant="outline">
          Year ahead
        </Button>
      </div>
      {isRouting ? <InlineLoading label={pendingLabel ?? "Calculating daily prediction..."} /> : null}
    </div>
  );
}
