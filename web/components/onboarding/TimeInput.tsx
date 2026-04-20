"use client";

import React from "react";
import { useMemo, useState } from "react";

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

export function TimeInput({ disabled, value, onChange }: Props) {
  const [mode, setMode] = useState<"24h" | "12h">("24h");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const timeValue = useMemo(() => value.slice(0, 5), [value]);

  if (mode === "12h") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            aria-label="Birth time"
            disabled={disabled}
            max="12:59"
            min="01:00"
            onChange={(event) => {
              const [hour = "0", minute = "0"] = event.target.value.split(":");
              onChange(to24Hour(Number(hour), Number(minute), 0, period));
            }}
            step="60"
            type="time"
          />
          <Select
            aria-label="AM or PM"
            disabled={disabled}
            onChange={(event) => {
              const nextPeriod = event.target.value as "AM" | "PM";
              setPeriod(nextPeriod);
            }}
            value={period}
          >
            <option>AM</option>
            <option>PM</option>
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
