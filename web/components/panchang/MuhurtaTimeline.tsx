import React from "react";
import { ShieldAlert, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Panchang } from "@/lib/schemas";

type MuhurtaWindow = NonNullable<Panchang["muhurta_windows"]>[number];

function seconds(time: string) {
  const [hours = 0, minutes = 0, secs = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + secs;
}

function percent(time: string, sunrise: string, sunset: string) {
  const start = seconds(sunrise);
  const end = seconds(sunset);
  const span = Math.max(end - start, 1);
  return Math.min(100, Math.max(0, ((seconds(time) - start) / span) * 100));
}

function timeInTimezone(now: Date, timezone?: string) {
  if (!timezone) {
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.hour}:${lookup.minute}:00`;
}

export function currentMuhurtaStatus(windows: MuhurtaWindow[] | undefined, now = new Date(), timezone?: string) {
  const current = timeInTimezone(now, timezone);
  const active = (windows ?? []).find((window) => current >= window.start && current <= window.end);
  if (!active) {
    return { label: "neutral", window: null as MuhurtaWindow | null };
  }
  return { label: active.kind === "auspicious" ? "auspicious" : "avoid", window: active };
}

export function MuhurtaTimeline({
  windows = [],
  sunrise,
  sunset,
}: {
  windows?: MuhurtaWindow[];
  sunrise: string;
  sunset: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Muhurta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative h-7 rounded-md border bg-muted">
          {windows.map((window) => {
            const left = percent(window.start, sunrise, sunset);
            const width = Math.max(percent(window.end, sunrise, sunset) - left, 2);
            return (
              <div
                aria-label={`${window.name} ${window.start} to ${window.end}`}
                className={cn(
                  "absolute top-0 h-full rounded-sm",
                  window.kind === "auspicious" ? "bg-emerald-500" : "bg-destructive",
                )}
                key={window.name}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${window.name}: ${window.start.slice(0, 5)} - ${window.end.slice(0, 5)}`}
              />
            );
          })}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {windows.map((window) => {
            const Icon = window.kind === "auspicious" ? Sparkles : ShieldAlert;
            return (
              <div className="flex items-start gap-3 rounded-md border bg-background p-3" key={window.name}>
                <Icon
                  className={cn("mt-0.5 h-4 w-4", window.kind === "auspicious" ? "text-emerald-600" : "text-destructive")}
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">{window.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {window.start.slice(0, 5)} - {window.end.slice(0, 5)}
                    {window.kind === "inauspicious" ? " (avoid)" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
