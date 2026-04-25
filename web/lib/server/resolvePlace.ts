import { resolveTimezoneFromCoordinates } from "@/lib/server/profileIntake";

const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_NOMINATIM_USER_AGENT = "Astri/0.1 place-search";
const NOMINATIM_CACHE_TTL_MS = 60 * 60 * 1000;
const NOMINATIM_MIN_REQUEST_INTERVAL_MS = 1100;

type NominatimPlace = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  addresstype?: string;
};

type ResolvePlaceOptions = {
  endpoint?: string;
  email?: string;
  fetcher?: typeof fetch;
  limit?: number;
  userAgent?: string;
};

export type ResolvedPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  warning?: string;
};

type CacheEntry = {
  expiresAt: number;
  places: ResolvedPlace[];
};

const placeCache = new Map<string, CacheEntry>();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueNominatimRequest<T>(request: () => Promise<T>) {
  const queuedRequest = requestQueue.then(async () => {
    const waitMs = NOMINATIM_MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      return await request();
    } finally {
      lastRequestAt = Date.now();
    }
  });

  requestQueue = queuedRequest.then(
    () => undefined,
    () => undefined,
  );

  return queuedRequest;
}

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBroadResult(place: NominatimPlace) {
  return place.addresstype === "country" || place.type === "country";
}

function cacheKey(endpoint: string, query: string, limit: number) {
  return `${endpoint}|${limit}|${query.toLowerCase()}`;
}

export async function resolvePlace(query: string, options: ResolvePlaceOptions = {}): Promise<ResolvedPlace[]> {
  const endpoint = options.endpoint ?? process.env.NOMINATIM_BASE_URL ?? DEFAULT_NOMINATIM_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const limit = options.limit ?? 5;

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const key = cacheKey(endpoint, trimmed, limit);
  const cached = placeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.places;
  }

  const params = new URLSearchParams({
    addressdetails: "1",
    format: "jsonv2",
    limit: String(limit),
    q: trimmed,
  });
  const email = options.email ?? process.env.NOMINATIM_EMAIL;
  if (email) {
    params.set("email", email);
  }

  const response = await queueNominatimRequest(() =>
    fetcher(`${endpoint}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": options.userAgent ?? process.env.NOMINATIM_USER_AGENT ?? DEFAULT_NOMINATIM_USER_AGENT,
      },
    }),
  );

  if (!response.ok) {
    throw new Error(`Nominatim lookup failed: ${response.status}`);
  }

  const body = (await response.json()) as NominatimPlace[];
  const places = body.flatMap((place) => {
    const latitude = parseCoordinate(place.lat);
    const longitude = parseCoordinate(place.lon);
    if (latitude === null || longitude === null || !place.display_name) {
      return [];
    }

    const isCountryLevel = isBroadResult(place);
    return {
      id: place.place_id ? String(place.place_id) : `${place.osm_type ?? "place"}-${place.osm_id ?? place.display_name}`,
      label: place.display_name,
      latitude,
      longitude,
      timezone: resolveTimezoneFromCoordinates(latitude, longitude),
      warning: isCountryLevel ? "This is a broad country-level match. Choose a city when possible." : undefined,
    };
  });

  placeCache.set(key, { expiresAt: Date.now() + NOMINATIM_CACHE_TTL_MS, places });
  return places;
}
