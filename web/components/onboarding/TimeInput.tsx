"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Props = {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
};

function to24Hour(hour: number, minute: number, second: number, period: "AM" | "PM") {
  const normalizedHour = period === "PM" ? (hour % 12) + 12 : hour % 12;
  return [normalizedHour, minute, second].map((part) => String(part).padStart(2, "0")).join(":");
}

function from24Hour(value: string) {
  const [hourText = "12", minuteText = "00"] = value.split(":");
  const hour24 = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;

  return { hour12, minute, period };
}

export function TimeInput({ disabled, value, onChange }: Props) {
  const [mode, setMode] = useState<"24h" | "12h">("24h");
  const parsed = useMemo(() => from24Hour(value), [value]);
  const [hour12, setHour12] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  useEffect(() => {
    setHour12(parsed.hour12);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [parsed.hour12, parsed.minute, parsed.period]);

  const timeValue = useMemo(() => value.slice(0, 5), [value]);
  const minuteValue = String(minute).padStart(2, "0");

  function emit12h(nextHour: number, nextMinute: number, nextPeriod: "AM" | "PM") {
    onChange(to24Hour(nextHour, nextMinute, 0, nextPeriod));
  }

  if (mode === "12h") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select
            aria-label="Hour"
            disabled={disabled}
            onChange={(event) => {
              const nextHour = Number.parseInt(event.target.value, 10);
              setHour12(nextHour);
              emit12h(nextHour, minute, period);
            }}
            value={String(hour12)}
          >
            {Array.from({ length: 12 }, (_, index) => {
              const candidate = index + 1;
              return (
                <option key={candidate} value={String(candidate)}>
                  {String(candidate).padStart(2, "0")}
                </option>
              );
            })}
          </Select>
          <Select
            aria-label="Minute"
            disabled={disabled}
            onChange={(event) => {
              const nextMinute = Number.parseInt(event.target.value, 10);
              setMinute(nextMinute);
              emit12h(hour12, nextMinute, period);
            }}
            value={minuteValue}
          >
            {Array.from({ length: 60 }, (_, index) => (
              <option key={index} value={String(index).padStart(2, "0")}>
                {String(index).padStart(2, "0")}
              </option>
            ))}
          </Select>
          <Select
            aria-label="AM or PM"
            disabled={disabled}
            onChange={(event) => {
              const nextPeriod = event.target.value as "AM" | "PM";
              setPeriod(nextPeriod);
              emit12h(hour12, minute, nextPeriod);
            }}
            value={period}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </Select>
          <Select aria-label="Time format" onChange={(event) => setMode(event.target.value as "24h" | "12h")} value={mode}>
            <option value="24h">24h</option>
            <option value="12h">12h</option>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          aria-label="Birth time"
          disabled={disabled}
          onChange={(event) => onChange(`${event.target.value}:00`)}
          step="60"
          type="time"
          value={timeValue}
        />
        <Select aria-label="Time format" onChange={(event) => setMode(event.target.value as "24h" | "12h")} value={mode}>
          <option value="24h">24h</option>
          <option value="12h">12h</option>
        </Select>
      </div>
    </div>
  );
}
