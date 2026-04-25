import React from "react";
import { CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Panchang } from "@/lib/schemas";

type ElementValue = Panchang["tithi"];

function endLabel(value: ElementValue) {
  if ("end_time" in value) {
    return `until ${value.end_time.slice(0, 5)}`;
  }
  if ("fraction_left" in value) {
    return `${Math.round(value.fraction_left * 100)}% remaining`;
  }
  return "";
}

function PanchangRow({ label, value }: { label: string; value: ElementValue }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 border-b py-3 last:border-b-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <span className="font-medium">{value.name}</span>
        <span className="text-sm text-muted-foreground">{endLabel(value)}</span>
      </dd>
    </div>
  );
}

export function PanchangCard({ panchang }: { panchang: Panchang }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm uppercase text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {panchang.date}
        </div>
        <CardTitle>Daily panchang</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <PanchangRow label="Tithi" value={panchang.tithi} />
          <PanchangRow label="Nakshatra" value={panchang.nakshatra} />
          <PanchangRow label="Yoga" value={panchang.yoga} />
          <PanchangRow label="Karana" value={panchang.karana} />
          <div className="grid grid-cols-[6.5rem_1fr] gap-3 py-3">
            <dt className="text-sm font-medium text-muted-foreground">Vaara</dt>
            <dd className="font-medium">{panchang.vaara}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
