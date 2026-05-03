import { getTransits } from "@/lib/astro/client";
import {
  ChartSnapshotSchema,
  type BirthProfile,
  type ChartSnapshot,
  type Planet,
  type PlanetPlacement,
  type TransitSummary,
} from "@/lib/schemas";

type DbError = { message: string } | Error;
type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;

type Query = {
  eq(column: string, value: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  limit(count: number): Query;
  maybeSingle(): QueryResult;
};

export type SupabaseAstrologyFactsExportClient = {
  from(table: string): {
    select(columns: string): Query;
  };
};

type BirthProfileRow = BirthProfile;

type ChartSnapshotRow = {
  id: string;
  engine_version: string;
  computed_at: string;
  payload: unknown;
};

export class AstrologyFactsExportInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AstrologyFactsExportInputError";
  }
}

export type AstrologyFactsExportData = {
  export_kind: "charts_transits_json";
  generated_at: string;
  requested_date: string;
  transit_at: string;
  profile: Pick<
    BirthProfileRow,
    | "id"
    | "name"
    | "birth_date"
    | "birth_time"
    | "birth_time_confidence"
    | "birth_place_text"
    | "latitude"
    | "longitude"
    | "timezone"
    | "ayanamsha"
  >;
  chart_snapshot: {
    id: string;
    engine_version: string;
    computed_at: string;
    summary: ChartSnapshot["summary"];
    lagna_longitude_deg?: number;
    chart_keys: string[];
    planetary_positions: ChartSnapshot["planetary_positions"];
    aspects: ChartSnapshot["aspects"];
    charts: ChartSnapshot["charts"];
  };
  transits: {
    as_of: string;
    positions: TransitSummary["positions"];
    natal_overlay: {
      planet_to_house: Partial<Record<Planet, number>>;
    };
  };
};

type PromptPlanetPlacement = Pick<
  PlanetPlacement,
  "planet" | "longitude_deg" | "sign" | "house" | "nakshatra" | "pada" | "retrograde" | "combust" | "dignity"
>;

export type AstrologyFactsAskContext = {
  source_export_kind: AstrologyFactsExportData["export_kind"];
  requested_date: string;
  transit_at: string;
  profile: Pick<AstrologyFactsExportData["profile"], "timezone" | "ayanamsha" | "birth_time_confidence">;
  natal_summary: ChartSnapshot["summary"];
  chart_keys: string[];
  natal_planets: PromptPlanetPlacement[];
  transits: {
    as_of: string;
    positions: PromptPlanetPlacement[];
    natal_overlay: AstrologyFactsExportData["transits"]["natal_overlay"];
  };
  allowed_citations: {
    charts: string[];
    houses: number[];
    planets: Planet[];
  };
};

function errorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

function asProfile(value: unknown): BirthProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<BirthProfileRow>;
  return typeof row.id === "string" ? (row as BirthProfileRow) : null;
}

function asChartRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ChartSnapshotRow>;
  return typeof row.id === "string" ? (row as ChartSnapshotRow) : null;
}

function assertIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AstrologyFactsExportInputError("Export date must be an ISO date in YYYY-MM-DD format.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AstrologyFactsExportInputError("Export date must be a valid calendar date.");
  }
}

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function timezoneOffsetMs(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return asUtc - instant.getTime();
}

function startOfDayInTimezoneIso(date: string, timezone: string) {
  assertIsoDate(date);
  const [year, month, day] = date.split("-").map(Number);
  const initial = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0));
  const firstGuess = new Date(initial.getTime() - timezoneOffsetMs(initial, timezone));
  const secondGuess = new Date(initial.getTime() - timezoneOffsetMs(firstGuess, timezone));
  return secondGuess.toISOString();
}

function resolveExportDate(date: string | undefined, timezone: string) {
  if (!date || date === "today") {
    return todayInTimezone(timezone);
  }
  assertIsoDate(date);
  return date;
}

function profileForExport(profile: BirthProfileRow): AstrologyFactsExportData["profile"] {
  return {
    id: profile.id,
    name: profile.name,
    birth_date: profile.birth_date,
    birth_time: profile.birth_time,
    birth_time_confidence: profile.birth_time_confidence,
    birth_place_text: profile.birth_place_text,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    ayanamsha: profile.ayanamsha,
  };
}

function planetToHouseFromPositions(transits: TransitSummary) {
  return Object.fromEntries(transits.positions.map((position) => [position.planet, position.house])) as Partial<Record<Planet, number>>;
}

function promptPlacement(position: PlanetPlacement): PromptPlanetPlacement {
  return {
    planet: position.planet,
    longitude_deg: position.longitude_deg,
    sign: position.sign,
    house: position.house,
    nakshatra: position.nakshatra,
    pada: position.pada,
    retrograde: position.retrograde,
    combust: position.combust,
    dignity: position.dignity,
  };
}

function uniqueNumbers(values: Array<number | undefined>) {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))].sort((left, right) => left - right);
}

function uniquePlanets(values: Array<Planet | undefined>) {
  return [...new Set(values.filter((value): value is Planet => Boolean(value)))].sort();
}

export function buildAstrologyFactsAskContext(data: AstrologyFactsExportData): AstrologyFactsAskContext {
  const natalPlanets = data.chart_snapshot.planetary_positions.map(promptPlacement);
  const transitPositions = data.transits.positions.map(promptPlacement);
  const overlayHouses = Object.values(data.transits.natal_overlay.planet_to_house);

  return {
    source_export_kind: data.export_kind,
    requested_date: data.requested_date,
    transit_at: data.transit_at,
    profile: {
      timezone: data.profile.timezone,
      ayanamsha: data.profile.ayanamsha,
      birth_time_confidence: data.profile.birth_time_confidence,
    },
    natal_summary: data.chart_snapshot.summary,
    chart_keys: data.chart_snapshot.chart_keys,
    natal_planets: natalPlanets,
    transits: {
      as_of: data.transits.as_of,
      positions: transitPositions,
      natal_overlay: data.transits.natal_overlay,
    },
    allowed_citations: {
      charts: [...new Set([...(data.chart_snapshot.chart_keys.includes("D1") ? ["D1"] : []), "Transit"])].sort(),
      houses: uniqueNumbers([
        ...natalPlanets.map((position) => position.house),
        ...transitPositions.map((position) => position.house),
        ...overlayHouses,
      ]),
      planets: uniquePlanets([
        ...natalPlanets.map((position) => position.planet),
        ...transitPositions.map((position) => position.planet),
        ...(Object.keys(data.transits.natal_overlay.planet_to_house) as Planet[]),
      ]),
    },
  };
}

export function renderAstrologyFactsJson(data: AstrologyFactsExportData) {
  return Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function loadAstrologyFactsExportData(input: {
  supabase: SupabaseAstrologyFactsExportClient;
  userId: string;
  profileId?: string;
  date?: string;
}): Promise<AstrologyFactsExportData> {
  let profileQuery = input.supabase
    .from("birth_profiles")
    .select(
      "id,user_id,name,birth_date,birth_time,birth_time_confidence,birth_place_text,latitude,longitude,timezone,ayanamsha,engine_version,status,created_at",
    )
    .eq("user_id", input.userId);
  if (input.profileId) {
    profileQuery = profileQuery.eq("id", input.profileId);
  }

  const { data: profileData, error: profileError } = await profileQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(errorMessage(profileError, "Could not load birth profile."));
  }
  const profile = asProfile(profileData);
  if (!profile) {
    throw new Error("No birth profile is available for export.");
  }
  if (profile.status !== "ready") {
    throw new Error("Profile generation must be complete before export.");
  }

  const { data: chartData, error: chartError } = await input.supabase
    .from("chart_snapshots")
    .select("id,engine_version,computed_at,payload")
    .eq("birth_profile_id", profile.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (chartError) {
    throw new Error(errorMessage(chartError, "Could not load chart snapshot."));
  }
  const chartRow = asChartRow(chartData);
  if (!chartRow) {
    throw new Error("No chart snapshot is available for export.");
  }

  const snapshot = ChartSnapshotSchema.parse(chartRow.payload);
  const requestedDate = resolveExportDate(input.date, profile.timezone);
  const transitAt = startOfDayInTimezoneIso(requestedDate, profile.timezone);
  const transits = await getTransits({
    birth_date: profile.birth_date,
    birth_time: profile.birth_time,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
    ayanamsha: profile.ayanamsha,
    at: transitAt,
    natal: {
      lagna_sign: snapshot.summary.lagna,
      planetary_positions: snapshot.planetary_positions,
    },
  });

  return {
    export_kind: "charts_transits_json",
    generated_at: new Date().toISOString(),
    requested_date: requestedDate,
    transit_at: transitAt,
    profile: profileForExport(profile),
    chart_snapshot: {
      id: chartRow.id,
      engine_version: chartRow.engine_version,
      computed_at: chartRow.computed_at,
      summary: snapshot.summary,
      lagna_longitude_deg: snapshot.lagna_longitude_deg,
      chart_keys: Object.keys(snapshot.charts).sort(),
      planetary_positions: snapshot.planetary_positions,
      aspects: snapshot.aspects,
      charts: snapshot.charts,
    },
    transits: {
      as_of: transits.as_of,
      positions: transits.positions,
      natal_overlay: {
        planet_to_house: transits.overlay?.planet_to_house ?? planetToHouseFromPositions(transits),
      },
    },
  };
}
