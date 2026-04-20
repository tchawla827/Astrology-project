"use client";

import React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveTimezoneFromCoordinates } from "@/lib/server/profileIntake";

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type?: string[];
};

export type PlaceSelection = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  warning?: string;
};

type Props = {
  mapboxToken?: string;
  onSelect: (place: PlaceSelection) => void;
};

export function PlaceAutocomplete({ mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function search(nextQuery: string) {
    setQuery(nextQuery);
    setMessage(null);
    if (nextQuery.trim().length < 2 || !mapboxToken) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const params = new URLSearchParams({
      access_token: mapboxToken,
      autocomplete: "true",
      limit: "5",
      types: "place,locality,district,region,country",
    });

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(nextQuery.trim())}.json?${params}`
      );
      if (!response.ok) {
        throw new Error(`Mapbox lookup failed: ${response.status}`);
      }
      const body = (await response.json()) as { features?: MapboxFeature[] };
      setResults(body.features ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not search places.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  function choose(feature: MapboxFeature) {
    const [longitude, latitude] = feature.center;
    const warning = feature.place_type?.includes("country")
      ? "This is a broad country-level match. Choose a city when possible."
      : undefined;

    setQuery(feature.place_name);
    setResults([]);
    setMessage(warning ?? null);
    onSelect({
      label: feature.place_name,
      latitude,
      longitude,
      timezone: resolveTimezoneFromCoordinates(latitude, longitude),
      warning,
    });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor="birth-place">
        Birth place
      </label>
      <Input
        autoComplete="off"
        id="birth-place"
        onChange={(event) => void search(event.target.value)}
        placeholder="City, region, country"
        value={query}
      />
      {isLoading ? <p className="text-xs text-muted-foreground">Searching places...</p> : null}
      {results.length > 0 ? (
        <div className="rounded-md border bg-background">
          {results.map((result) => (
            <Button
              className="h-auto w-full justify-start rounded-none px-3 py-2 text-left"
              key={result.id}
              onClick={() => choose(result)}
              type="button"
              variant="ghost"
            >
              {result.place_name}
            </Button>
          ))}
        </div>
      ) : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
