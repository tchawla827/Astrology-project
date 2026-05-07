"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ToneSelector } from "@/components/ask/ToneSelector";
import { InlineLoading } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import type { ToneMode } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10) - 1;
  const day = Number.parseInt(match[3] ?? "", 10);
  const parsed = new Date(Date.UTC(year, month, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number) {
  return [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function formatDateLabel(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(parsed.year, parsed.month, parsed.day)),
  );
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
  const parsedDate = parseIsoDate(date);
  const initialView = parsedDate ?? parseIsoDate(todayDate) ?? parseIsoDate(min) ?? { year: 2026, month: 0 };
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const [isPending, startTransition] = useTransition();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftDate(date);
    setPendingLabel(null);
    const parsed = parseIsoDate(date);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [date, tone]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

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
  const years = useMemo(() => {
    const minYear = Number.parseInt(min.slice(0, 4), 10);
    const maxYear = Number.parseInt(max.slice(0, 4), 10);
    return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  }, [max, min]);
  const days = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [viewMonth, viewYear]);

  const currentMonthStart = toIsoDate(viewYear, viewMonth, 1);
  const currentMonthEnd = toIsoDate(viewYear, viewMonth, new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate());
  const canGoPrevious = currentMonthStart > min;
  const canGoNext = currentMonthEnd < max;

  function routeTo(nextDate: string, nextTone = tone) {
    if (!nextDate || nextDate < min || nextDate > max || (nextDate === date && nextTone === tone)) {
      return;
    }
    setDraftDate(nextDate);
    setPendingLabel(`Calculating ${nextDate} prediction...`);
    setIsOpen(false);
    startTransition(() => {
      router.push(`/daily/${nextDate}?tone=${nextTone}`);
    });
  }

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  const isRouting = isPending || pendingLabel !== null;
  const selectedValue = parsedDate ? toIsoDate(parsedDate.year, parsedDate.month, parsedDate.day) : "";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-background/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Selected date</span>
          <div className="flex flex-col gap-2 sm:flex-row" ref={rootRef}>
            <label className="relative flex-1 sm:w-48">
              <span className="sr-only">Daily timeline date</span>
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
              <input
                className="min-h-11 w-full rounded-md border border-primary/20 bg-background px-3 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isRouting}
                max={max}
                min={min}
                onBlur={() => routeTo(draftDate)}
                onChange={(event) => setDraftDate(event.target.value)}
                type="date"
                value={draftDate}
              />
            </label>
            <div className="relative">
              <Button
                aria-expanded={isOpen}
                aria-label="Open daily date picker"
                className="w-full gap-2 sm:w-auto"
                disabled={isRouting}
                onClick={() => setIsOpen((current) => !current)}
                type="button"
                variant="outline"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {formatDateLabel(draftDate)}
              </Button>
              {isOpen ? (
                <div
                  aria-label="Daily date picker"
                  className="absolute left-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-primary/20 bg-card p-3 shadow-xl"
                  role="dialog"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      aria-label="Previous month"
                      disabled={!canGoPrevious}
                      onClick={() => shiftMonth(-1)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <select
                      aria-label="Daily month"
                      className="h-9 flex-1 rounded-md border border-primary/20 bg-background px-2 text-sm"
                      onChange={(event) => setViewMonth(Number.parseInt(event.target.value, 10))}
                      value={viewMonth}
                    >
                      {MONTHS.map((month, index) => (
                        <option key={month} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Daily year"
                      className="h-9 w-24 rounded-md border border-primary/20 bg-background px-2 text-sm"
                      onChange={(event) => setViewYear(Number.parseInt(event.target.value, 10))}
                      value={viewYear}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <Button
                      aria-label="Next month"
                      disabled={!canGoNext}
                      onClick={() => shiftMonth(1)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                    {WEEKDAYS.map((weekday) => (
                      <div className="py-1" key={weekday}>
                        {weekday}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      if (day === null) {
                        return <div className="aspect-square" key={`blank-${index}`} />;
                      }

                      const dayValue = toIsoDate(viewYear, viewMonth, day);
                      const isSelected = dayValue === selectedValue;
                      const isDisabled = dayValue < min || dayValue > max;

                      return (
                        <button
                          aria-label={`Select ${MONTHS[viewMonth]} ${day}, ${viewYear}`}
                          className={cn(
                            "aspect-square rounded-md text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
                            isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-transparent",
                          )}
                          disabled={isDisabled}
                          key={dayValue}
                          onClick={() => routeTo(dayValue)}
                          type="button"
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
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
