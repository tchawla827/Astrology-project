import { resolveTimezoneFromCoordinates } from "@/lib/server/profileIntake";

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type?: string[];
};

export type ResolvedPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  warning?: string;
};

export async function resolvePlace(query: string, token = process.env.MAPBOX_TOKEN): Promise<ResolvedPlace[]> {
  if (!token) {
    throw new Error("MAPBOX_TOKEN is not configured.");
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    limit: "5",
    types: "place,locality,district,region,country",
  });
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?${params}`);

  if (!response.ok) {
    throw new Error(`Mapbox lookup failed: ${response.status}`);
  }

  const body = (await response.json()) as { features?: MapboxFeature[] };
  return (body.features ?? []).map((feature) => {
    const [longitude, latitude] = feature.center;
    const isCountryLevel = feature.place_type?.includes("country") ?? false;
    return {
      id: feature.id,
      label: feature.place_name,
      latitude,
      longitude,
      timezone: resolveTimezoneFromCoordinates(latitude, longitude),
      warning: isCountryLevel ? "This is a broad country-level match. Choose a city when possible." : undefined,
    };
  });
}

