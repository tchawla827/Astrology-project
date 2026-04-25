import React from "react";
import { Sun, Sunset } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parseTimeSeconds(time: string) {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatSeconds(total: number) {
  const wrapped = ((Math.round(total) % 86400) + 86400) % 86400;
  const hours = Math.floor(wrapped / 3600);
  const minutes = Math.floor((wrapped % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function solarNoon(sunrise: string, sunset: string) {
  return formatSeconds((parseTimeSeconds(sunrise) + parseTimeSeconds(sunset)) / 2);
}

export function SunTimes({ sunrise, sunset }: { sunrise: string; sunset: string }) {
  const items = [
    { label: "Sunrise", value: sunrise.slice(0, 5), icon: Sun },
    { label: "Solar noon", value: solarNoon(sunrise, sunset), icon: Sun },
    { label: "Sunset", value: sunset.slice(0, 5), icon: Sunset },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sun times</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div className="rounded-md border bg-background p-3" key={item.label}>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </dt>
              <dd className="mt-2 text-lg font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
