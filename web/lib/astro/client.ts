import type { ZodType } from "zod";

import {
  ChartSchema,
  ChartSnapshotSchema,
  DashaTimelineSchema,
  PanchangSchema,
  TransitSummarySchema,
} from "@/lib/schemas";

export type Ayanamsha = "lahiri" | "raman" | "kp";

export interface BirthProfile {
  birth_date: string;
  birth_time: string;
  timezone: string;
  latitude: number;
  longitude: number;
  ayanamsha?: Ayanamsha;
}

export interface ProfileRequest extends BirthProfile {
  include_charts?: string[];
  as_of?: string;
}

export interface ChartRequest extends BirthProfile {}

export interface DashaRequest extends BirthProfile {
  depth?: "mahadasha" | "antardasha" | "pratyantardasha";
  from?: string;
  to?: string;
}

export interface TransitRequest extends BirthProfile {
  at: string;
}

export interface PanchangRequest {
  date: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha?: Ayanamsha;
}

export interface PlanetPlacement {
  planet: string;
  longitude_deg: number;
  sign: string;
  house: number;
  nakshatra: string;
  pada: number;
  retrograde: boolean;
  combust: boolean;
  dignity: string;
}

export interface HouseEntry {
  house: number;
  sign: string;
  lord: string;
}

export interface ChartPlanet {
  planet: string;
  sign: string;
  house: number;
}

export interface ChartResponse {
  chart_key: string;
  ascendant_sign: string;
  houses: HouseEntry[];
  planets: ChartPlanet[];
}

export interface DashaPeriod {
  lord: string;
  start: string;
  end: string;
}

export interface DashaSummary {
  system: string;
  current_mahadasha: DashaPeriod;
  current_antardasha: DashaPeriod;
  upcoming: DashaPeriod[];
}

export interface TransitSummary {
  as_of: string;
  positions: PlanetPlacement[];
  highlights: string[];
}

export interface YogaEntry {
  name: string;
  confidence: "low" | "medium" | "high";
  source_charts: string[];
  planets_involved: string[];
  notes: string[];
}

export interface ChartSnapshot {
  id?: string;
  birth_profile_id?: string;
  computed_at?: string;
  birth_time_confidence?: "exact" | "approximate" | "unknown";
  engine_version: string;
  summary: {
    lagna: string;
    moon_sign: string;
    nakshatra: string;
    pada: number;
  };
  charts: Record<string, ChartResponse>;
  planetary_positions: PlanetPlacement[];
  aspects: unknown[];
  yogas: YogaEntry[];
  dasha: DashaSummary;
  transits: TransitSummary;
  lagna_longitude_deg?: number;
}

export interface DashaTimeline {
  system: string;
  periods: Array<{
    level: "mahadasha" | "antardasha" | "pratyantardasha";
    lord: string;
    start: string;
    end: string;
  }>;
}

export interface PanchangResponse {
  date: string;
  latitude: number;
  longitude: number;
  tithi: { name: string; fraction_left: number } | { name: string; end_time: string };
  nakshatra: { name: string; fraction_left: number } | { name: string; end_time: string };
  yoga: { name: string; fraction_left: number } | { name: string; end_time: string };
  karana: { name: string; fraction_left: number } | { name: string; end_time: string };
  vaara: string;
  sunrise: string;
  sunset: string;
  ayanamsha_deg?: number;
  sidereal_time?: string;
  muhurta_windows?: Array<{
    name: string;
    start: string;
    end: string;
    kind: "auspicious" | "inauspicious";
  }>;
}

export interface AstroEngineErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class AstroEngineError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AstroEngineError";
  }
}

interface CallOptions {
  baseUrl?: string;
  secret?: string;
  signal?: AbortSignal;
}

async function callAstroEngine<TResponse>(
  path: string,
  body: unknown,
  schema: ZodType<TResponse>,
  opts: CallOptions = {},
): Promise<TResponse> {
  const baseUrl = opts.baseUrl ?? process.env.ASTRO_ENGINE_URL;
  const secret = opts.secret ?? process.env.ASTRO_ENGINE_SECRET;

  if (!baseUrl || !secret) {
    throw new AstroEngineError("Astro engine environment is not configured.", 500);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Astro-Secret": secret,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!response.ok) {
    let code: string | undefined;
    let message = `Astro engine request failed: ${response.status}`;
    let details: unknown;
    try {
      const parsed = (await response.json()) as AstroEngineErrorBody | { detail?: AstroEngineErrorBody };
      const errorBody = "error" in parsed ? parsed.error : parsed.detail?.error;
      if (errorBody) {
        code = errorBody.code;
        message = errorBody.message;
        details = errorBody.details;
      }
    } catch {
      // swallow JSON parse failures and keep default message
    }
    throw new AstroEngineError(message, response.status, code, details);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AstroEngineError(
      `Astro engine response validation failed for ${path}.`,
      502,
      "INVALID_ENGINE_RESPONSE",
      parsed.error.flatten(),
    );
  }

  return parsed.data;
}

export async function generateProfile(body: ProfileRequest, opts?: CallOptions) {
  return callAstroEngine<ChartSnapshot>("/profile", body, ChartSnapshotSchema, opts);
}

export async function getChart(chartKey: string, body: ChartRequest, opts?: CallOptions) {
  return callAstroEngine<ChartResponse>(`/charts/${chartKey}`, body, ChartSchema, opts);
}

export async function getDasha(body: DashaRequest, opts?: CallOptions) {
  return callAstroEngine<DashaTimeline>("/dasha", body, DashaTimelineSchema, opts);
}

export async function getTransits(body: TransitRequest, opts?: CallOptions) {
  return callAstroEngine<TransitSummary>("/transits", body, TransitSummarySchema, opts);
}

export async function getPanchang(body: PanchangRequest, opts?: CallOptions) {
  return callAstroEngine<PanchangResponse>("/panchang", body, PanchangSchema, opts);
}
