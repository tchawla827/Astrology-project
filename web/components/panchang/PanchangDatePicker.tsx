"use client";

import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";

export function PanchangDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftDate, setDraftDate] = useState(date);

  useEffect(() => {
    setDraftDate(date);
  }, [date]);

  function routeTo(nextDate: string) {
    const query = searchParams.toString();
    router.push(`/panchang/${nextDate}${query ? `?${query}` : ""}`);
  }

  return (
    <label className="flex items-center gap-2 rounded-lg border bg-background p-4 text-sm font-medium">
      <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
      <input
        className="h-9 rounded-md border bg-background px-3 text-sm"
        onBlur={() => routeTo(draftDate)}
        onChange={(event) => setDraftDate(event.target.value)}
        type="date"
        value={draftDate}
      />
    </label>
  );
}
