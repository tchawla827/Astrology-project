import { DailyPredictionSchema, type DailyPrediction } from "@/lib/schemas/daily";
import {
  ChartSnapshotSchema,
  DerivedFeaturePayloadSchema,
  type ChartSnapshot,
  type DerivedFeaturePayload,
  type DashaTimeline,
  type Panchang,
  type Planet,
  type PlanetPlacement,
  type ToneMode,
  type TransitSummary,
} from "@/lib/schemas";
import { getDasha, getPanchang, getTransits } from "@/lib/astro/client";
import {
  readDailyPredictionCache,
  readTransitCache,
  writeDailyPredictionCache,
  writeTransitCache,
  type SupabaseDailyCacheClient,
} from "@/lib/daily/cache";
import { LlmCitationError, LlmContextError, LlmProviderError, LlmSchemaError } from "@/lib/llm/errors";
import { PROMPT_VERSIONS, systemPromptV1 } from "@/lib/llm/prompts";
import { routeDailyV1 } from "@/lib/llm/prompts/route/daily_v1";
import { callWithFallback, type LlmProvider } from "@/lib/llm/providers";

type DbError = { message: string } | Error;
type QueryResult = PromiseLike<{ data: unknown; error: DbError | null }>;

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseDailyClient = SupabaseDailyCacheClient & {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    upsert(payload: unknown, options?: { onConflict?: string }): PromiseLike<{ error: DbError | null }>;
  };
};

type BirthProfileRow = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  birth_place_text: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: "lahiri" | "raman" | "kp";
  engine_version: string;
  status: "processing" | "ready" | "error";
  created_at: string;
};

type ChartSnapshotRow = {
  id: string;
  engine_version: string;
  computed_at: string;
  payload: unknown;
};

type DerivedSnapshotRow = {
  id: string;
  schema_version: string;
  computed_at: string;
  payload: unknown;
};

export type TransitRuleHit = {
  rule: string;
  planet: Planet;
  note: string;
  house?: number;
};

export type DailyContextBundle = {
  context_id: string;
  date: string;
  tone: ToneMode;
  profile_summary: ChartSnapshot["summary"];
  birth_time_confidence: BirthProfileRow["birth_time_confidence"];
  dasha_timing: {
    system: "vimshottari";
    active_mahadasha?: DashaTimeline["periods"][number];
    active_antardasha?: DashaTimeline["periods"][number];
    active_pratyantardasha?: DashaTimeline["periods"][number];
  };
  panchang: {
    vaara: string;
    tithi: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    sunrise: string;
    sunset: string;
    muhurta_windows: NonNullable<Panchang["muhurta_windows"]>;
  };
  transit_positions: Array<Pick<PlanetPlacement, "planet" | "sign" | "house" | "retrograde" | "dignity">>;
  triggered_houses: number[];
  transit_rules: TransitRuleHit[];
  relevant_topic_signals: Array<{ topic: string; headline_signals: string[] }>;
  allowed_citations: {
    charts: ["Transit", "D1"];
    planets: Planet[];
    triggered_houses: number[];
    transit_rules: string[];
  };
};

export type GenerateDailyPredictionInput = {
  supabase: SupabaseDailyClient;
  profile_id: string;
  date: string;
  tone: ToneMode;
  providers?: LlmProvider[];
};

export type GenerateDailyPredictionResult = {
  prediction: DailyPrediction;
  transits: TransitSummary;
  profile: Pick<BirthProfileRow, "id" | "name" | "birth_time_confidence" | "birth_date" | "timezone">;
  context: DailyContextBundle;
  cache: {
    prediction: "hit" | "miss";
    transits: "hit" | "miss";
  };
};

const signs = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const malefics: Planet[] = ["Mars", "Saturn", "Rahu", "Ketu"];
const luminaries: Planet[] = ["Sun", "Moon"];

function errorMessage(error: DbError | null, fallback: string) {
  return error?.message ?? fallback;
}

function asProfile(value: unknown): BirthProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<BirthProfileRow>;
  if (typeof row.id === "string" && typeof row.status === "string") {
    return row as BirthProfileRow;
  }
  return null;
}

function asChartRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ChartSnapshotRow>;
  return typeof row.id === "string" ? (row as ChartSnapshotRow) : null;
}

function asDerivedRow(value: unknown): DerivedSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<DerivedSnapshotRow>;
  return typeof row.id === "string" ? (row as DerivedSnapshotRow) : null;
}

function assertIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new LlmContextError("Daily prediction date must be an ISO date in YYYY-MM-DD format.");
  }
}

function plusYears(date: string, years: number) {
  const [year, month, day] = date.split("-").map(Number);
  return `${String((year ?? 0) + years).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function plusDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function compareDate(a: string, b: string) {
  return a.localeCompare(b);
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

export function startOfDayInTimezoneIso(date: string, timezone: string) {
  assertIsoDate(date);
  const [year, month, day] = date.split("-").map(Number);
  const initial = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0));
  const firstGuess = new Date(initial.getTime() - timezoneOffsetMs(initial, timezone));
  const secondGuess = new Date(initial.getTime() - timezoneOffsetMs(firstGuess, timezone));
  return secondGuess.toISOString();
}

function panchangValueName(value: Panchang["tithi"]) {
  return value.name;
}

function activePeriod(timeline: DashaTimeline, level: DashaTimeline["periods"][number]["level"], date: string) {
  return timeline.periods.find((period) => period.level === level && period.start <= date && period.end > date);
}

async function loadDateWiseAstroContext(input: { profile: BirthProfileRow; date: string }) {
  const [panchang, dasha] = await Promise.all([
    getPanchang({
      date: input.date,
      latitude: input.profile.latitude,
      longitude: input.profile.longitude,
      timezone: input.profile.timezone,
      ayanamsha: input.profile.ayanamsha,
    }),
    getDasha({
      birth_date: input.profile.birth_date,
      birth_time: input.profile.birth_time,
      latitude: input.profile.latitude,
      longitude: input.profile.longitude,
      timezone: input.profile.timezone,
      ayanamsha: input.profile.ayanamsha,
      depth: "pratyantardasha",
      from: input.date,
      to: plusDays(input.date, 1),
    }),
  ]);

  return {
    panchang: {
      vaara: panchang.vaara,
      tithi: panchangValueName(panchang.tithi),
      nakshatra: panchangValueName(panchang.nakshatra),
      yoga: panchangValueName(panchang.yoga),
      karana: panchangValueName(panchang.karana),
      sunrise: panchang.sunrise,
      sunset: panchang.sunset,
      muhurta_windows: panchang.muhurta_windows ?? [],
    },
    dasha_timing: {
      system: dasha.system,
      active_mahadasha: activePeriod(dasha, "mahadasha", input.date),
      active_antardasha: activePeriod(dasha, "antardasha", input.date),
      active_pratyantardasha: activePeriod(dasha, "pratyantardasha", input.date),
    },
  };
}

export function resolveDailyDate(dateParam: string, timezone: string) {
  if (dateParam === "today") {
    return todayInTimezone(timezone);
  }
  assertIsoDate(dateParam);
  return dateParam;
}

function validateDateBounds(date: string, profile: BirthProfileRow) {
  const maxDate = plusYears(profile.birth_date, 120);
  if (compareDate(date, profile.birth_date) < 0 || compareDate(date, maxDate) > 0) {
    throw new LlmContextError(`Daily prediction date must be between ${profile.birth_date} and ${maxDate}.`);
  }
}

function signIndex(sign: string) {
  const index = signs.indexOf(sign as (typeof signs)[number]);
  return index >= 0 ? index : 0;
}

function houseOfSign(sign: string, lagnaSign: string) {
  return ((signIndex(sign) - signIndex(lagnaSign) + 12) % 12) + 1;
}

function circularDiff(a: number, b: number) {
  return Math.abs(((a - b + 180) % 360) - 180);
}

export function buildTransitOverlay(input: {
  transits: TransitSummary;
  natalPositions: PlanetPlacement[];
  lagnaSign: string;
}) {
  const natalByPlanet = new Map(input.natalPositions.map((position) => [position.planet, position]));
  const positions = input.transits.positions.map((position) => ({
    ...position,
    house: houseOfSign(position.sign, input.lagnaSign),
  }));
  const transitByPlanet = new Map(positions.map((position) => [position.planet, position]));
  const hits: TransitRuleHit[] = [];

  const saturn = transitByPlanet.get("Saturn");
  if (saturn && [1, 4, 7, 10].includes(saturn.house)) {
    hits.push({ rule: "saturn_kendra_pressure", planet: "Saturn", house: saturn.house, note: `Saturn pressure on kendra ${saturn.house}` });
  }

  const jupiter = transitByPlanet.get("Jupiter");
  if (jupiter && [1, 5, 9].includes(jupiter.house)) {
    hits.push({ rule: "jupiter_trine_support", planet: "Jupiter", house: jupiter.house, note: `Jupiter support on trine ${jupiter.house}` });
  }

  const rahu = transitByPlanet.get("Rahu");
  const natalMoon = natalByPlanet.get("Moon");
  if (rahu && natalMoon && rahu.house === natalMoon.house) {
    hits.push({ rule: "rahu_moon_house_conjunction", planet: "Rahu", house: rahu.house, note: "Rahu-Moon conjunction in transit" });
  }

  for (const malefic of malefics) {
    const transit = transitByPlanet.get(malefic);
    if (!transit) {
      continue;
    }
    for (const luminary of luminaries) {
      const natal = natalByPlanet.get(luminary);
      if (natal && circularDiff(transit.longitude_deg, natal.longitude_deg) <= 3) {
        hits.push({
          rule: `${malefic.toLowerCase()}_near_natal_${luminary.toLowerCase()}`,
          planet: malefic,
          note: `${malefic} within 3 deg of natal ${luminary}`,
        });
      }
    }
  }

  const moon = transitByPlanet.get("Moon");
  if (moon) {
    hits.push({
      rule: "moon_daily_house_focus",
      planet: "Moon",
      house: moon.house,
      note: `Moon daily focus through house ${moon.house}`,
    });
  }

  const triggeredHouses = [...new Set(hits.flatMap((hit) => (hit.house ? [hit.house] : [])))].sort((a, b) => a - b);
  const planetToHouse = Object.fromEntries(positions.map((position) => [position.planet, position.house])) as Record<Planet, number>;

  return {
    transits: {
      ...input.transits,
      positions,
      highlights: hits.map((hit) => hit.note),
      overlay: {
        triggered_houses: triggeredHouses,
        planet_to_house: planetToHouse,
      },
    },
    hits,
    triggeredHouses,
  };
}

function relevantTopicSignals(derived: DerivedFeaturePayload, triggeredHouses: number[]) {
  return Object.entries(derived.topic_bundles)
    .map(([topic, bundle]) => ({
      topic,
      headline_signals: triggeredHouses.some((house) => Object.prototype.hasOwnProperty.call(bundle.houses, house))
        ? bundle.headline_signals.slice(0, 3)
        : [],
    }))
    .filter((entry) => entry.headline_signals.length > 0);
}

function buildDailyContext(input: {
  date: string;
  tone: ToneMode;
  snapshot: ChartSnapshot;
  derived: DerivedFeaturePayload;
  dateWiseAstro: Awaited<ReturnType<typeof loadDateWiseAstroContext>>;
  birth_time_confidence: BirthProfileRow["birth_time_confidence"];
  chart_snapshot_id: string;
  transits: TransitSummary;
  hits: TransitRuleHit[];
  triggeredHouses: number[];
}): DailyContextBundle {
  const dashaPlanets = [
    input.dateWiseAstro.dasha_timing.active_mahadasha?.lord,
    input.dateWiseAstro.dasha_timing.active_antardasha?.lord,
    input.dateWiseAstro.dasha_timing.active_pratyantardasha?.lord,
  ].filter((planet): planet is Planet => Boolean(planet));
  const planets = [...new Set([...input.hits.map((hit) => hit.planet), ...dashaPlanets])];
  return {
    context_id: input.chart_snapshot_id,
    date: input.date,
    tone: input.tone,
    profile_summary: input.snapshot.summary,
    birth_time_confidence: input.birth_time_confidence,
    dasha_timing: input.dateWiseAstro.dasha_timing,
    panchang: input.dateWiseAstro.panchang,
    transit_positions: input.transits.positions.map((position) => ({
      planet: position.planet,
      sign: position.sign,
      house: position.house,
      retrograde: position.retrograde,
      dignity: position.dignity,
    })),
    triggered_houses: input.triggeredHouses,
    transit_rules: input.hits,
    relevant_topic_signals: relevantTopicSignals(input.derived, input.triggeredHouses),
    allowed_citations: {
      charts: ["Transit", "D1"],
      planets,
      triggered_houses: input.triggeredHouses,
      transit_rules: input.hits.map((hit) => hit.rule),
    },
  };
}

function buildDailyPrompt(context: DailyContextBundle) {
  return `Tone: ${context.tone}

Context:
${JSON.stringify(context, null, 2)}

Return ONLY JSON matching DailyPrediction schema. Use date "${context.date}", tone "${context.tone}", and answer_schema_version "daily_v1".`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown, fallback: string, maxLength?: number) {
  const text = typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
  return maxLength ? text.slice(0, maxLength) : text;
}

function asTextArray(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? [value] : fallback;
  const items = source
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
  return items.length > 0 ? items : fallback.slice(0, 5);
}

function normalizeDailyPrediction(output: unknown, context: DailyContextBundle): unknown {
  const candidate = asRecord(output);
  const fallback = fallbackPrediction(context);

  return {
    date: context.date,
    verdict: asText(candidate.verdict, fallback.verdict, 280),
    favorable: asTextArray(candidate.favorable, fallback.favorable),
    caution: asTextArray(candidate.caution, fallback.caution),
    technical_basis: {
      triggered_houses: context.allowed_citations.triggered_houses,
      planets_used: context.allowed_citations.planets,
      transit_rules: context.allowed_citations.transit_rules,
    },
    tone: context.tone,
    answer_schema_version: "daily_v1",
  };
}

function validateDailyPrediction(output: unknown, context: DailyContextBundle): DailyPrediction {
  const parsed = DailyPredictionSchema.safeParse(output);
  if (!parsed.success) {
    throw new LlmSchemaError("LLM output did not match DailyPrediction schema.", { cause: parsed.error });
  }

  const prediction = parsed.data;
  if (prediction.date !== context.date || prediction.tone !== context.tone) {
    throw new LlmCitationError("Daily answer cited a date or tone outside the requested context.", "chart");
  }

  const allowedHouses = context.allowed_citations.triggered_houses;
  const missingHouses = prediction.technical_basis.triggered_houses.filter((house) => !allowedHouses.includes(house));
  if (missingHouses.length > 0) {
    throw new LlmCitationError(`Daily answer cited house(s) not present in overlay: ${missingHouses.join(", ")}.`, "house");
  }
  if (prediction.technical_basis.triggered_houses.join(",") !== allowedHouses.join(",")) {
    throw new LlmCitationError("Daily answer must use exactly the overlay triggered_houses.", "house");
  }

  const allowedPlanets = context.allowed_citations.planets;
  const missingPlanets = prediction.technical_basis.planets_used.filter((planet) => !allowedPlanets.includes(planet));
  if (missingPlanets.length > 0) {
    throw new LlmCitationError(`Daily answer cited planet(s) not present in transit rules: ${missingPlanets.join(", ")}.`, "planet");
  }

  const allowedRules = context.allowed_citations.transit_rules;
  const missingRules = prediction.technical_basis.transit_rules.filter((rule) => !allowedRules.includes(rule));
  if (missingRules.length > 0) {
    throw new LlmCitationError(`Daily answer cited transit rule(s) not present in overlay: ${missingRules.join(", ")}.`, "chart");
  }

  return prediction;
}

async function loadProfile(supabase: SupabaseDailyClient, profileId: string) {
  const { data, error } = await supabase
    .from("birth_profiles")
    .select("id,user_id,name,birth_date,birth_time,birth_time_confidence,birth_place_text,latitude,longitude,timezone,ayanamsha,engine_version,status,created_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new LlmContextError(errorMessage(error, "Could not load birth profile."));
  }
  const profile = asProfile(data);
  if (!profile) {
    throw new LlmContextError("Birth profile not found.");
  }
  if (profile.status !== "ready") {
    throw new LlmContextError(profile.status === "processing" ? "Profile generation is still running." : "Profile generation failed.");
  }
  return profile;
}

async function loadContextRows(supabase: SupabaseDailyClient, profileId: string) {
  const [{ data: chartData, error: chartError }, { data: derivedData, error: derivedError }] = await Promise.all([
    supabase
      .from("chart_snapshots")
      .select("id,engine_version,computed_at,payload")
      .eq("birth_profile_id", profileId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("derived_feature_snapshots")
      .select("id,schema_version,computed_at,payload")
      .eq("birth_profile_id", profileId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (chartError) {
    throw new LlmContextError(errorMessage(chartError, "Could not load chart snapshot."));
  }
  if (derivedError) {
    throw new LlmContextError(errorMessage(derivedError, "Could not load derived feature snapshot."));
  }

  const chartRow = asChartRow(chartData);
  const derivedRow = asDerivedRow(derivedData);
  if (!chartRow) {
    throw new LlmContextError("No chart snapshot is available for daily predictions.");
  }
  if (!derivedRow) {
    throw new LlmContextError("No derived feature snapshot is available for daily predictions.");
  }

  const snapshot = ChartSnapshotSchema.parse(chartRow.payload);
  const derived = DerivedFeaturePayloadSchema.parse(derivedRow.payload);
  return { chartRow, derivedRow, snapshot, derived };
}

async function loadTransitSummary(input: {
  supabase: SupabaseDailyClient;
  profile: BirthProfileRow;
  date: string;
}) {
  const cached = await readTransitCache({
    supabase: input.supabase,
    date: input.date,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
  });
  if (cached) {
    return { transits: cached.transits, cache: "hit" as const };
  }

  const transits = await getTransits({
    birth_date: input.profile.birth_date,
    birth_time: input.profile.birth_time,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
    at: startOfDayInTimezoneIso(input.date, input.profile.timezone),
  });

  await writeTransitCache({
    supabase: input.supabase,
    date: input.date,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
    transits,
  });

  return { transits, cache: "miss" as const };
}

function fallbackPrediction(context: DailyContextBundle): DailyPrediction {
  const rules = context.transit_rules.map((hit) => hit.rule);
  const planets = context.allowed_citations.planets;
  const supportive = context.transit_rules.filter(
    (hit) => hit.rule.includes("jupiter") || hit.rule.includes("moon_daily"),
  );
  const cautionary = context.transit_rules.filter(
    (hit) =>
      hit.rule.includes("saturn") ||
      hit.rule.includes("rahu") ||
      hit.rule.includes("ketu") ||
      hit.rule.includes("mars") ||
      hit.rule.includes("near_natal"),
  );
  const moonFocus = context.transit_rules.find((hit) => hit.rule === "moon_daily_house_focus");
  return {
    date: context.date,
    verdict:
      moonFocus && context.transit_rules.length === 1
        ? `Moon activates house ${moonFocus.house} for the selected date; no heavier Saturn, Jupiter, Rahu, or luminary-stress trigger dominates the overlay.`
        : context.triggered_houses.length > 0
          ? `The day is shaped by transit activity through houses ${context.triggered_houses.join(", ")}.`
        : "The day has no major rule-based transit trigger in the current overlay.",
    favorable: supportive
      .map((hit) => hit.note)
      .slice(0, 5),
    caution: [
      ...cautionary.map((hit) => hit.note),
      ...(moonFocus && cautionary.length === 0
        ? ["Treat this as a fast daily Moon signal, not a heavy long-term transit."]
        : []),
    ].slice(0, 5),
    technical_basis: {
      triggered_houses: context.triggered_houses,
      planets_used: planets,
      transit_rules: rules,
    },
    tone: context.tone,
    answer_schema_version: "daily_v1",
  };
}

async function generateWithLlm(input: { context: DailyContextBundle; providers?: LlmProvider[] }) {
  if (input.context.transit_rules.length === 0) {
    return fallbackPrediction(input.context);
  }

  let result: Awaited<ReturnType<typeof callWithFallback>>;
  try {
    result = await callWithFallback({
      system: systemPromptV1,
      messages: [{ role: "user", content: `${routeDailyV1}\n\n${buildDailyPrompt(input.context)}` }],
      schema: DailyPredictionSchema,
      topic: "daily",
      context_bundle_id: input.context.context_id,
      prompt_versions: {
        system: PROMPT_VERSIONS.system,
        route: PROMPT_VERSIONS.daily_route,
        user: PROMPT_VERSIONS.user,
      },
      answer_schema_version: PROMPT_VERSIONS.daily_answer_schema,
      providers: input.providers,
    });
  } catch (error) {
    if (error instanceof LlmProviderError) {
      return fallbackPrediction(input.context);
    }
    throw error;
  }

  return validateDailyPrediction(normalizeDailyPrediction(result.output, input.context), input.context);
}

export async function generateDailyPrediction(input: GenerateDailyPredictionInput): Promise<GenerateDailyPredictionResult> {
  const profile = await loadProfile(input.supabase, input.profile_id);
  const date = resolveDailyDate(input.date, profile.timezone);
  validateDateBounds(date, profile);

  const cachedPrediction = await readDailyPredictionCache({
    supabase: input.supabase,
    birth_profile_id: profile.id,
    date,
    tone: input.tone,
  });

  const { chartRow, snapshot, derived } = await loadContextRows(input.supabase, profile.id);
  const [transitResult, dateWiseAstro] = await Promise.all([
    loadTransitSummary({ supabase: input.supabase, profile, date }),
    loadDateWiseAstroContext({ profile, date }),
  ]);
  const overlay = buildTransitOverlay({
    transits: transitResult.transits,
    natalPositions: snapshot.planetary_positions,
    lagnaSign: snapshot.summary.lagna,
  });
  const context = buildDailyContext({
    date,
    tone: input.tone,
    snapshot,
    derived,
    dateWiseAstro,
    birth_time_confidence: snapshot.birth_time_confidence ?? profile.birth_time_confidence,
    chart_snapshot_id: chartRow.id,
    transits: overlay.transits,
    hits: overlay.hits,
    triggeredHouses: overlay.triggeredHouses,
  });

  if (cachedPrediction) {
    return {
      prediction: cachedPrediction.prediction,
      transits: overlay.transits,
      profile,
      context,
      cache: { prediction: "hit", transits: transitResult.cache },
    };
  }

  const prediction = await generateWithLlm({ context, providers: input.providers });
  await writeDailyPredictionCache({ supabase: input.supabase, birth_profile_id: profile.id, prediction });

  return {
    prediction,
    transits: overlay.transits,
    profile,
    context,
    cache: { prediction: "miss", transits: transitResult.cache },
  };
}
