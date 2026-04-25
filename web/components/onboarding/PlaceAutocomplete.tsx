"use client";

import { Search } from "lucide-react";
import React from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlaceSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  warning?: string;
};

export type PlaceSelection = {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  warning?: string;
};

type Props = {
  onSelect: (place: PlaceSelection) => void;
  searchEndpoint?: string;
};

export function PlaceAutocomplete({ onSelect, searchEndpoint = "/api/places/search" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const selectedLabel = useRef<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  async function searchPlaces() {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === selectedLabel.current) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setMessage(null);
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ q: trimmed });
      const response = await fetch(`${searchEndpoint}?${params}`, { signal: controller.signal });
      const body = (await response.json()) as { places?: PlaceSearchResult[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? `Place lookup failed: ${response.status}`);
      }
      setResults(body.places ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setMessage(error instanceof Error ? error.message : "Could not search places.");
      setResults([]);
    } finally {
      if (activeRequest.current === controller) {
        setIsLoading(false);
      }
    }
  }

  function choose(place: PlaceSearchResult) {
    selectedLabel.current = place.label;
    setQuery(place.label);
    setResults([]);
    setMessage(place.warning ?? null);
    onSelect({
      label: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
      warning: place.warning,
    });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor="birth-place">
        Birth place
      </label>
      <div className="flex gap-2">
        <Input
          autoComplete="off"
          id="birth-place"
          onChange={(event) => {
            selectedLabel.current = null;
            setMessage(null);
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchPlaces();
            }
          }}
          placeholder="City, region, country"
          value={query}
        />
        <Button aria-label="Search places" disabled={isLoading} onClick={() => void searchPlaces()} type="button" variant="secondary">
          <Search aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
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
              {result.label}
            </Button>
          ))}
        </div>
      ) : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      <p className="text-[0.68rem] text-muted-foreground">Place search data © OpenStreetMap contributors.</p>
    </div>
  );
}
