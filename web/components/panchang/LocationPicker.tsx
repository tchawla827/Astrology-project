"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useEffect, useState, useTransition } from "react";

import { InlineLoading } from "@/components/common/LoadingState";
import { PlaceAutocomplete, type PlaceSelection } from "@/components/onboarding/PlaceAutocomplete";
import { Button } from "@/components/ui/button";

function buildPath(date: string, place: PlaceSelection) {
  const params = new URLSearchParams({
    lat: String(place.latitude),
    lon: String(place.longitude),
    tz: place.timezone,
    loc: place.label,
  });
  return `/panchang/${date}?${params}`;
}

export function LocationPicker({
  date,
  label,
  source,
}: {
  date: string;
  label: string;
  source: "birth" | "override";
}) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    setPendingLabel(null);
  }, [date, label, source]);

  function choose(place: PlaceSelection) {
    setPendingLabel(`Calculating timing for ${place.label}...`);
    startTransition(() => {
      router.push(buildPath(date, place));
    });
    setIsChanging(false);
  }

  const isRouting = isPending || pendingLabel !== null;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{source === "birth" ? "Using birth location" : "Using location override"}</p>
          </div>
        </div>
        <Button disabled={isRouting} onClick={() => setIsChanging((value) => !value)} size="sm" type="button" variant="outline">
          {isRouting ? "Calculating..." : "Change"}
        </Button>
      </div>
      {isRouting ? <InlineLoading className="mt-4" label={pendingLabel ?? "Calculating panchang..."} /> : null}
      {isChanging ? (
        <div className="mt-4">
          <PlaceAutocomplete onSelect={choose} />
        </div>
      ) : null}
    </div>
  );
}
