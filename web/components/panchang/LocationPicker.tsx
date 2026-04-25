"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useState } from "react";

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

  function choose(place: PlaceSelection) {
    router.push(buildPath(date, place));
    setIsChanging(false);
  }

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
        <Button onClick={() => setIsChanging((value) => !value)} size="sm" type="button" variant="outline">
          Change
        </Button>
      </div>
      {isChanging ? (
        <div className="mt-4">
          <PlaceAutocomplete onSelect={choose} />
        </div>
      ) : null}
    </div>
  );
}
