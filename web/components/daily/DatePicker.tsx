"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ToneSelector } from "@/components/ask/ToneSelector";
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
  useEffect(() => {
    setDraftDate(date);
  }, [date]);
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
    setDraftDate(nextDate);
    router.push(`/daily/${nextDate}?tone=${nextTone}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <input
            className="h-9 rounded-md border bg-background px-3 text-sm"
            max={max}
            min={min}
            onChange={(event) => setDraftDate(event.target.value)}
            onBlur={() => routeTo(draftDate)}
            type="date"
            value={draftDate}
          />
        </label>
        <ToneSelector value={tone} onChange={(nextTone) => routeTo(draftDate, nextTone)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <Button
            disabled={shortcut.value < min || shortcut.value > max}
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
    </div>
  );
}
