"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function todayIso() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function toIsoDate(year: number, month: number, day: number) {
  return [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function toDisplayDate(year: number, month: number, day: number) {
  return [String(day).padStart(2, "0"), String(month + 1).padStart(2, "0"), year].join("-");
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10) - 1;
  const day = Number.parseInt(match[3] ?? "", 10);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return { year, month, day };
}

function parseDisplayDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const day = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10) - 1;
  const year = Number.parseInt(match[3] ?? "", 10);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return { year, month, day };
}

function formatIsoForDisplay(value: string) {
  const parsed = parseIsoDate(value);
  return parsed ? toDisplayDate(parsed.year, parsed.month, parsed.day) : "";
}

function defaultViewDate() {
  const now = new Date();
  return { year: now.getFullYear() - 25, month: now.getMonth() };
}

export function BirthDatePicker({
  id,
  value,
  onChange,
  required = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const parsedValue = parseIsoDate(value);
  const initialView = parsedValue ?? defaultViewDate();
  const [isOpen, setIsOpen] = useState(false);
  const [draftDisplay, setDraftDisplay] = useState(() => formatIsoForDisplay(value));
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmittedValueRef = useRef(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const maxDate = todayIso();
  const currentYear = Number.parseInt(maxDate.slice(0, 4), 10);
  const minYear = currentYear - 120;
  const years = useMemo(
    () => Array.from({ length: currentYear - minYear + 1 }, (_, index) => currentYear - index),
    [currentYear, minYear],
  );

  useEffect(() => {
    if (value !== lastEmittedValueRef.current) {
      setDraftDisplay(formatIsoForDisplay(value));
    }

    const parsed = parseIsoDate(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const days = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [viewMonth, viewYear]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDay(day: number) {
    const nextValue = toIsoDate(viewYear, viewMonth, day);
    if (nextValue <= maxDate) {
      inputRef.current?.setCustomValidity("");
      setDraftDisplay(toDisplayDate(viewYear, viewMonth, day));
      lastEmittedValueRef.current = nextValue;
      onChange(nextValue);
      setIsOpen(false);
    }
  }

  function changeDraftDisplay(nextDisplay: string) {
    setDraftDisplay(nextDisplay);
    inputRef.current?.setCustomValidity("");

    if (nextDisplay.trim() === "") {
      lastEmittedValueRef.current = "";
      onChange("");
      return;
    }

    if (nextDisplay.length !== 10) {
      lastEmittedValueRef.current = "";
      onChange("");
      return;
    }

    const parsed = parseDisplayDate(nextDisplay);
    const nextValue = parsed ? toIsoDate(parsed.year, parsed.month, parsed.day) : "";
    if (!parsed || nextValue > maxDate) {
      inputRef.current?.setCustomValidity("Enter a valid birth date in DD-MM-YYYY.");
      lastEmittedValueRef.current = "";
      onChange("");
      return;
    }

    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  }

  const selectedValue = parsedValue ? toIsoDate(parsedValue.year, parsedValue.month, parsedValue.day) : "";

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            aria-label="Birth date"
            autoComplete="bday"
            className="pl-9"
            id={id}
            inputMode="numeric"
            max={maxDate}
            maxLength={10}
            onChange={(event) => changeDraftDisplay(event.target.value)}
            onFocus={() => setIsOpen(true)}
            pattern="\d{2}-\d{2}-\d{4}"
            placeholder="DD-MM-YYYY"
            ref={inputRef}
            required={required}
            type="text"
            value={draftDisplay}
          />
        </div>
        <Button
          aria-expanded={isOpen}
          aria-label="Open birth date picker"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
          variant="outline"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {isOpen ? (
        <div
          className="absolute z-20 mt-2 w-full rounded-lg border bg-card p-3 shadow-xl sm:w-[22rem]"
          role="dialog"
          aria-label="Birth date picker"
        >
          <div className="flex items-center gap-2">
            <Button aria-label="Previous month" onClick={() => shiftMonth(-1)} size="sm" type="button" variant="ghost">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <select
              aria-label="Birth month"
              className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
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
              aria-label="Birth year"
              className="h-9 w-24 rounded-md border bg-background px-2 text-sm"
              onChange={(event) => setViewYear(Number.parseInt(event.target.value, 10))}
              value={viewYear}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <Button aria-label="Next month" onClick={() => shiftMonth(1)} size="sm" type="button" variant="ghost">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1">
                {weekday}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`blank-${index}`} className="aspect-square" />;
              }

              const dayValue = toIsoDate(viewYear, viewMonth, day);
              const isSelected = dayValue === selectedValue;
              const isDisabled = dayValue > maxDate;

              return (
                <button
                  aria-label={`Select ${MONTHS[viewMonth]} ${day}, ${viewYear}`}
                  className={cn(
                    "aspect-square rounded-md text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
                    isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-transparent",
                  )}
                  disabled={isDisabled}
                  key={dayValue}
                  onClick={() => selectDay(day)}
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
  );
}
