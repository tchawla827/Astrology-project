import type {
  Chart,
  ChartSnapshot,
  DashaTimeline,
  Planet,
  PlanetPlacement,
  TransitSummary,
  Yoga,
} from "@/lib/schemas";
import { DailyAspectSchema, type DailyAspectScore, type DailyScoreBreakdown } from "@/lib/schemas/daily";

export type DailyScoringDashaTiming = {
  system: "vimshottari";
  active_mahadasha?: DashaTimeline["periods"][number];
  active_antardasha?: DashaTimeline["periods"][number];
  active_pratyantardasha?: DashaTimeline["periods"][number];
};

type DailyAspect = DailyAspectScore["aspect"];
type BirthTimeConfidence = "exact" | "approximate" | "unknown";
type HouseGroups = Record<string, readonly number[]>;

type AspectConfig = {
  meaning: string;
  charts: Record<string, number>;
  houses: HouseGroups;
  planets: readonly Planet[];
  primaryVarga: string;
};

type ComponentResult = {
  score: number;
  notes: string[];
};

type FunctionalNature = "benefic" | "malefic" | "mixed" | "yogakaraka" | "neutral";

type RealityVector = {
  opportunity: number;
  ease: number;
  risk: number;
  confidence: "low" | "medium" | "high";
  notes: string[];
};

type TransitRuleContribution = {
  rule: string;
  delta: number;
  planet?: Planet;
  house?: number;
  note: string;
};

type ScoredAspect = {
  aspectScore: DailyAspectScore;
  breakdown: DailyScoreBreakdown;
  rules: TransitRuleContribution[];
  planets: Planet[];
  houses: number[];
};

export type DailyScoringInput = {
  snapshot: ChartSnapshot;
  transits: TransitSummary;
  dashaTiming: DailyScoringDashaTiming;
  birthTimeConfidence: BirthTimeConfidence;
};

export type DailyScoringResult = {
  aspect_scores: DailyAspectScore[];
  score_breakdown: DailyScoreBreakdown[];
  basis: {
    houses: number[];
    planets: Planet[];
    transit_rules: string[];
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

const signLords: Record<string, Planet> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

const exaltationSign: Partial<Record<Planet, string>> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mars: "Capricorn",
  Mercury: "Virgo",
  Jupiter: "Cancer",
  Venus: "Pisces",
  Saturn: "Libra",
  Rahu: "Taurus",
  Ketu: "Scorpio",
};

const debilitationSign: Partial<Record<Planet, string>> = {
  Sun: "Libra",
  Moon: "Scorpio",
  Mars: "Cancer",
  Mercury: "Pisces",
  Jupiter: "Capricorn",
  Venus: "Virgo",
  Saturn: "Aries",
  Rahu: "Scorpio",
  Ketu: "Taurus",
};

const ownSigns: Partial<Record<Planet, readonly string[]>> = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
};

const friends: Partial<Record<Planet, readonly Planet[]>> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};

const enemies: Partial<Record<Planet, readonly Planet[]>> = {
  Sun: ["Venus", "Saturn"],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};

const benefics = new Set<Planet>(["Jupiter", "Venus", "Mercury", "Moon"]);
const malefics = new Set<Planet>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
const hardMalefics = new Set<Planet>(["Mars", "Saturn", "Rahu", "Ketu"]);
const nodes = new Set<Planet>(["Rahu", "Ketu"]);
const kendraHouses = new Set([1, 4, 7, 10]);
const trikonaHouses = new Set([1, 5, 9]);
const upachayaHouses = new Set([3, 6, 10, 11]);
const dusthanaHouses = new Set([6, 8, 12]);
const marakaHouses = new Set([2, 7]);

const nakshatras = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashirsha",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

const taraScores: Record<number, number> = {
  1: -1.4,
  2: 1.1,
  3: -1.2,
  4: 1.0,
  5: -1.7,
  6: 1.2,
  7: -1.1,
  8: 1.5,
  0: 1.4,
};

function ascendantSign(snapshot: ChartSnapshot, chartKey = "D1") {
  return chart(snapshot, chartKey)?.ascendant_sign ?? chart(snapshot, "D1")?.ascendant_sign ?? snapshot.summary?.lagna ?? "Aries";
}

function functionalNature(snapshot: ChartSnapshot, planet: Planet): FunctionalNature {
  if (planet === "Rahu" || planet === "Ketu") {
    return "malefic";
  }
  const lagna = ascendantSign(snapshot, "D1");
  const ownershipChart = chart(snapshot, "D1") ?? chart(snapshot, "Bhava");
  const ownedHouses = ownershipChart?.houses.filter((entry) => entry.lord === planet).map((entry) => entry.house) ?? [];
  if (ownedHouses.length === 0) {
    return "neutral";
  }
  const ownsKendra = ownedHouses.some((house) => kendraHouses.has(house));
  const ownsTrikona = ownedHouses.some((house) => trikonaHouses.has(house));
  const ownsDusthana = ownedHouses.some((house) => dusthanaHouses.has(house));
  const ownsMaraka = ownedHouses.some((house) => marakaHouses.has(house));

  if (ownsKendra && ownsTrikona && !ownsDusthana) {
    return "yogakaraka";
  }

  // High-value lagna-specific correction. For Taurus lagna, Saturn owns 9th and 10th and should not
  // be treated as a simple hard malefic in career/focus scoring.
  if (lagna === "Taurus" && planet === "Saturn") {
    return "yogakaraka";
  }
  if (lagna === "Taurus" && planet === "Mercury") {
    return "benefic";
  }
  if (lagna === "Taurus" && planet === "Jupiter") {
    return "malefic";
  }
  if (lagna === "Taurus" && planet === "Mars") {
    return "malefic";
  }
  if (lagna === "Taurus" && planet === "Moon") {
    return "mixed";
  }

  if (ownsDusthana && !ownsTrikona) {
    return ownsKendra ? "mixed" : "malefic";
  }
  if (ownsMaraka && !ownsTrikona && !ownsKendra) {
    return "malefic";
  }
  if (ownsTrikona) {
    return "benefic";
  }
  if (ownsKendra) {
    return benefics.has(planet) ? "mixed" : "benefic";
  }
  return "neutral";
}

function functionalNatureScale(chartKey: string) {
  if (chartKey === "D1" || chartKey === "Bhava") {
    return 1;
  }
  if (chartKey === "Moon") {
    return 0.75;
  }
  return 0.55;
}

function functionalNatureScore(snapshot: ChartSnapshot, planet: Planet, aspect: DailyAspect, chartKey = "D1") {
  const nature = functionalNature(snapshot, planet);
  const scale = functionalNatureScale(chartKey);
  let score = 0;
  if (nature === "yogakaraka") {
    score = aspect === "career" || aspect === "focus" ? 2.2 : 1.2;
  } else if (nature === "benefic") {
    score = 1.2;
  } else if (nature === "mixed") {
    score = aspect === "emotional" || aspect === "love" ? -0.3 : 0.4;
  } else if (nature === "malefic") {
    score = aspect === "career" || aspect === "focus" ? -0.4 : -1.2;
  }
  return score * scale;
}

function planetInfluenceScore(snapshot: ChartSnapshot, planet: Planet, aspect: DailyAspect, chartKey = "D1") {
  const natural = benefics.has(planet) ? 0.7 : hardMalefics.has(planet) ? -0.9 : malefics.has(planet) ? -0.4 : 0;
  const functional = functionalNatureScore(snapshot, planet, aspect, chartKey);
  if ((aspect === "career" || aspect === "focus") && upachayaHouses.has(chartPlanet(snapshot, chartKey, planet)?.house ?? 0) && hardMalefics.has(planet)) {
    return natural * 0.4 + functional + 0.8;
  }
  return natural + functional;
}

function nakshatraIndex(name?: string) {
  if (!name) {
    return -1;
  }
  return nakshatras.findIndex((nakshatra) => nakshatra.toLowerCase() === name.toLowerCase());
}

function taraBalaDelta(natalNakshatra?: string, transitNakshatra?: string) {
  const natalIndex = nakshatraIndex(natalNakshatra);
  const transitIndex = nakshatraIndex(transitNakshatra);
  if (natalIndex < 0 || transitIndex < 0) {
    return 0;
  }
  const tara = ((transitIndex - natalIndex + 27) % 27) % 9;
  return taraScores[tara] ?? 0;
}

export const DAILY_ASPECT_V3_CONFIG = {
  career: {
    meaning: "work output, responsibility, recognition, skill, salary movement, and practical progress",
    charts: { D1: 0.25, Bhava: 0.2, Moon: 0.15, D10: 0.3, D24: 0.05, D2: 0.03, D11: 0.02 },
    houses: {
      primary: [10],
      support: [2, 6, 11],
      effort: [3],
      luck: [9],
      caution: [8, 12],
    },
    planets: ["Sun", "Mercury", "Jupiter", "Saturn", "Mars"],
    primaryVarga: "D10",
  },
  love: {
    meaning: "romance, attraction, partnership warmth, commitment, intimacy, and relational friction",
    charts: { D1: 0.25, Bhava: 0.2, Moon: 0.2, D9: 0.3, D7: 0.03, D12: 0.02 },
    houses: {
      primary: [5, 7],
      intimacy: [8, 12],
      fulfillment: [11],
      conflict: [6],
      caution: [6, 8, 12],
    },
    planets: ["Venus", "Moon", "Jupiter", "Mars"],
    primaryVarga: "D9",
  },
  emotional: {
    meaning: "mood stability, inner security, stress, sleep, anxiety, and emotional recovery",
    charts: { Moon: 0.35, D1: 0.2, Bhava: 0.15, D4: 0.1, D8: 0.07, D12: 0.06, D30: 0.07 },
    houses: {
      primary: [1, 4],
      stress: [6, 8, 12],
      isolation: [12],
      sudden: [8],
      support: [5, 9, 11],
    },
    planets: ["Moon", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"],
    primaryVarga: "Moon",
  },
  focus: {
    meaning: "concentration, logic, practice, discipline, execution, study, and distraction risk",
    charts: { D1: 0.2, Bhava: 0.2, Moon: 0.2, D24: 0.25, D10: 0.1, D3: 0.05 },
    houses: {
      primary: [3, 6, 10],
      intelligence: [5],
      higherLearning: [9],
      results: [11],
      distraction: [8, 12],
      support: [5, 9, 11],
    },
    planets: ["Mercury", "Moon", "Saturn", "Mars", "Jupiter"],
    primaryVarga: "D24",
  },
} satisfies Record<DailyAspect, AspectConfig>;

export function dailyScoreLabel(score: number): DailyAspectScore["label"] {
  if (score <= 34) {
    return "low";
  }
  if (score <= 54) {
    return "mixed";
  }
  if (score <= 74) {
    return "steady";
  }
  return "strong";
}

export function dailyAspectSentence(aspect: DailyAspect, label: DailyAspectScore["label"]) {
  const copy = {
    career: {
      low: "Career output needs restraint, cleaner priorities, and less reliance on quick wins.",
      mixed: "Career progress is possible, but the day rewards structure more than speed.",
      steady: "Career work is supported through disciplined execution and realistic targets.",
      strong: "Career action has strong support for visible progress and decisive output.",
    },
    love: {
      low: "Love needs patience, lower assumptions, and fewer reactive conversations today.",
      mixed: "Love is workable if expectations stay simple and pressure stays low.",
      steady: "Love has enough warmth for honest, low-pressure contact.",
      strong: "Love carries clear warmth and easier emotional exchange.",
    },
    emotional: {
      low: "Emotionally, the day can feel heavy or reactive, so recovery space matters.",
      mixed: "Emotionally, the day is sensitive but manageable with a grounded rhythm.",
      steady: "Emotionally, you can stay steady if the day stays simple.",
      strong: "Emotionally, the day can feel settled, protected, and self-contained.",
    },
    focus: {
      low: "Focus may scatter unless the task list is cut down sharply.",
      mixed: "Focus improves when you keep the day narrow and avoid context switching.",
      steady: "Focus is steady enough for one clear priority and measured execution.",
      strong: "Focus is strong for decisive, concentrated work.",
    },
  } satisfies Record<DailyAspect, Record<DailyAspectScore["label"], string>>;
  return copy[aspect][label];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function signIndex(sign: string) {
  const index = signs.indexOf(sign as (typeof signs)[number]);
  return index >= 0 ? index : 0;
}

function houseOfSign(sign: string, lagnaSign: string) {
  return ((signIndex(sign) - signIndex(lagnaSign) + 12) % 12) + 1;
}

function advanceHouse(house: number, offset: number) {
  return ((house + offset - 1) % 12) + 1;
}

function circularDiff(a: number, b: number) {
  return Math.abs(((a - b + 180) % 360) - 180);
}

function orbMultiplier(deg: number) {
  if (deg <= 1) {
    return 1;
  }
  if (deg <= 2) {
    return 0.75;
  }
  if (deg <= 3) {
    return 0.5;
  }
  if (deg <= 5) {
    return 0.25;
  }
  return 0;
}

function dignityScore(dignity: PlanetPlacement["dignity"]) {
  switch (dignity) {
    case "exalted":
      return 4;
    case "moolatrikona":
      return 3;
    case "own":
      return 2.5;
    case "friendly":
      return 1;
    case "enemy":
      return -1;
    case "debilitated":
      return -4;
    case "neutral":
      return 0;
  }
}

function estimateDignity(planet: Planet, sign: string, longitude?: number): PlanetPlacement["dignity"] {
  const degreeInSign = typeof longitude === "number" ? longitude % 30 : undefined;
  if (planet === "Sun" && sign === "Leo" && degreeInSign !== undefined && degreeInSign < 20) {
    return "moolatrikona";
  }
  if (planet === "Moon" && sign === "Taurus" && degreeInSign !== undefined && degreeInSign >= 4) {
    return "moolatrikona";
  }
  if (planet === "Mars" && sign === "Aries" && degreeInSign !== undefined && degreeInSign < 12) {
    return "moolatrikona";
  }
  if (planet === "Mercury" && sign === "Virgo" && degreeInSign !== undefined && degreeInSign >= 16 && degreeInSign < 20) {
    return "moolatrikona";
  }
  if (planet === "Jupiter" && sign === "Sagittarius" && degreeInSign !== undefined && degreeInSign < 10) {
    return "moolatrikona";
  }
  if (planet === "Venus" && sign === "Libra" && degreeInSign !== undefined && degreeInSign < 15) {
    return "moolatrikona";
  }
  if (planet === "Saturn" && sign === "Aquarius" && degreeInSign !== undefined && degreeInSign < 20) {
    return "moolatrikona";
  }
  if (exaltationSign[planet] === sign) {
    return "exalted";
  }
  if (debilitationSign[planet] === sign) {
    return "debilitated";
  }
  if (ownSigns[planet]?.includes(sign)) {
    return "own";
  }
  if (planet === "Rahu" || planet === "Ketu") {
    return "neutral";
  }
  const lord = signLords[sign];
  if (!lord) {
    return "neutral";
  }
  if (friends[planet]?.includes(lord)) {
    return "friendly";
  }
  if (enemies[planet]?.includes(lord)) {
    return "enemy";
  }
  return "neutral";
}

function chart(snapshot: ChartSnapshot, chartKey: string): Chart | undefined {
  return snapshot.charts[chartKey];
}

function chartHouseLord(snapshot: ChartSnapshot, chartKey: string, house: number): Planet | undefined {
  return chart(snapshot, chartKey)?.houses.find((entry) => entry.house === house)?.lord;
}

function chartPlanet(snapshot: ChartSnapshot, chartKey: string, planet: Planet) {
  return chart(snapshot, chartKey)?.planets.find((entry) => entry.planet === planet);
}

function natalPlacement(snapshot: ChartSnapshot, planet: Planet) {
  return snapshot.planetary_positions.find((entry) => entry.planet === planet);
}

function transitPlacement(transits: TransitSummary, planet: Planet) {
  return transits.positions.find((entry) => entry.planet === planet);
}

function aspectHousesFrom(house: number, planet: Planet) {
  const houses = [advanceHouse(house, 6)];
  if (planet === "Mars") {
    houses.push(advanceHouse(house, 3));
    houses.push(advanceHouse(house, 7));
  }
  if (planet === "Jupiter" || planet === "Rahu" || planet === "Ketu") {
    houses.push(advanceHouse(house, 4));
    houses.push(advanceHouse(house, 8));
  }
  if (planet === "Saturn") {
    houses.push(advanceHouse(house, 2));
    houses.push(advanceHouse(house, 9));
  }
  return unique(houses.filter((value) => value >= 1 && value <= 12));
}

function aspectsHouse(fromHouse: number, planet: Planet, targetHouse: number) {
  return aspectHousesFrom(fromHouse, planet).includes(targetHouse);
}

function configuredHouses(config: AspectConfig, groups?: string[]) {
  const selected = groups ?? Object.keys(config.houses);
  return unique(selected.flatMap((group) => [...(config.houses[group] ?? [])]));
}

function positiveHouses(aspect: DailyAspect) {
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  if (aspect === "love") {
    return configuredHouses(config, ["primary", "fulfillment"]);
  }
  if (aspect === "emotional") {
    return configuredHouses(config, ["primary", "support"]);
  }
  if (aspect === "focus") {
    return configuredHouses(config, ["primary", "intelligence", "higherLearning", "results"]);
  }
  return configuredHouses(config, ["primary", "support", "effort", "luck"]);
}

function cautionHouses(aspect: DailyAspect) {
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  if (aspect === "focus") {
    return configuredHouses(config, ["distraction"]);
  }
  if (aspect === "emotional") {
    return configuredHouses(config, ["stress", "isolation", "sudden"]);
  }
  return configuredHouses(config, ["caution", "conflict"]);
}

function houseContextAdjustment(aspect: DailyAspect, house: number) {
  let score = 0;
  if (kendraHouses.has(house)) {
    score += 1.2;
  }
  if (trikonaHouses.has(house)) {
    score += 1.5;
  }
  if (upachayaHouses.has(house)) {
    score += aspect === "career" || aspect === "focus" ? 1.4 : 0.3;
  }
  if (dusthanaHouses.has(house)) {
    if ((aspect === "career" || aspect === "focus") && house === 6) {
      score += 1.2;
    } else {
      score -= house === 8 ? 2.2 : 1.8;
    }
  }
  if ((aspect === "love" || aspect === "emotional") && marakaHouses.has(house)) {
    score -= 0.7;
  }
  if (positiveHouses(aspect).includes(house)) {
    score += 1.5;
  }
  if (cautionHouses(aspect).includes(house)) {
    score -= 1.8;
  }
  return score;
}

function chartAspectScore(snapshot: ChartSnapshot, chartKey: string, planet: Planet, house: number, aspect: DailyAspect) {
  const aspects = chart(snapshot, chartKey)?.aspects ?? (chartKey === "D1" || chartKey === "Bhava" || chartKey === "Moon" ? snapshot.aspects : []);
  return aspects.reduce((score, aspectEntry) => {
    const targetMatches = aspectEntry.to === planet || aspectEntry.to === house;
    if (!targetMatches) {
      return score;
    }
    const orbWeight = typeof aspectEntry.orb_deg === "number" ? Math.max(0.35, orbMultiplier(aspectEntry.orb_deg)) : 0.6;
    const influence = planetInfluenceScore(snapshot, aspectEntry.from, aspect, chartKey);
    return score + influence * 1.25 * orbWeight;
  }, 0);
}

function planetStrength(snapshot: ChartSnapshot, chartKey: string, planet: Planet, aspect: DailyAspect) {
  const c = chart(snapshot, chartKey);
  const inChart = chartPlanet(snapshot, chartKey, planet);
  if (!c || !inChart) {
    return 0;
  }

  const natal = natalPlacement(snapshot, planet);
  const chartLongitude = inChart.longitude_deg ?? natal?.longitude_deg;
  const dignity =
    inChart.dignity ??
    (chartKey === "D1" || chartKey === "Bhava" || chartKey === "Moon"
      ? natal?.dignity ?? estimateDignity(planet, inChart.sign, chartLongitude)
      : estimateDignity(planet, inChart.sign, chartLongitude));
  let score = dignityScore(dignity) + functionalNatureScore(snapshot, planet, aspect, chartKey) + houseContextAdjustment(aspect, inChart.house);

  if (inChart.combust && planet !== "Sun") {
    score -= planet === "Mercury" ? 1 : 1.8;
  }
  if (inChart.varga_symbolic_combust && chartKey !== "D1" && chartKey !== "Bhava" && chartKey !== "Moon" && planet !== "Sun") {
    score -= 0.6;
  }
  if (inChart.retrograde) {
    score += aspect === "career" || aspect === "focus" ? 0.8 : -0.4;
  }
  score += chartAspectScore(snapshot, chartKey, planet, inChart.house, aspect);

  if ((chartKey === "D1" || chartKey === "Bhava" || chartKey === "Moon") && natal) {
    if (natal.retrograde && inChart.retrograde === undefined) {
      score += aspect === "career" || aspect === "focus" ? 0.8 : -0.4;
    }
    for (const node of ["Rahu", "Ketu"] as const) {
      const nodePlacement = natalPlacement(snapshot, node);
      if (nodePlacement) {
        const multiplier = orbMultiplier(circularDiff(natal.longitude_deg, nodePlacement.longitude_deg));
        if (multiplier > 0 && planet !== node) {
          score -= 2.5 * multiplier;
        }
      }
    }
  }

  return clamp(score / 8, -1, 1);
}

function houseStrength(snapshot: ChartSnapshot, chartKey: string, house: number, aspect: DailyAspect) {
  const c = chart(snapshot, chartKey);
  const lord = chartHouseLord(snapshot, chartKey, house);
  if (!c || !lord) {
    return 0;
  }

  const occupants = c.planets.filter((entry) => entry.house === house).map((entry) => entry.planet);
  const lordScore = planetStrength(snapshot, chartKey, lord, aspect) * 5;
  const occupantScore = occupants.reduce((score, planet) => {
    return score + planetInfluenceScore(snapshot, planet, aspect, chartKey);
  }, 0);
  const score = lordScore + occupantScore + houseContextAdjustment(aspect, house);
  return clamp(score / 8, -1, 1);
}

function average(values: number[]) {
  const finite = values.filter(Number.isFinite);
  return finite.length > 0 ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
}

function lagnaLordStrength(snapshot: ChartSnapshot, chartKey: string, aspect: DailyAspect) {
  return chartHouseLord(snapshot, chartKey, 1)
    ? planetStrength(snapshot, chartKey, chartHouseLord(snapshot, chartKey, 1) as Planet, aspect)
    : 0;
}

function houseLordStrength(snapshot: ChartSnapshot, chartKey: string, house: number, aspect: DailyAspect) {
  const lord = chartHouseLord(snapshot, chartKey, house);
  return lord ? planetStrength(snapshot, chartKey, lord, aspect) : 0;
}

function karakaStrength(snapshot: ChartSnapshot, aspect: DailyAspect) {
  return average(DAILY_ASPECT_V3_CONFIG[aspect].planets.map((planet) => planetStrength(snapshot, "D1", planet, aspect)));
}

function influenceOnPlanet(snapshot: ChartSnapshot, planet: Planet) {
  const placement = natalPlacement(snapshot, planet);
  if (!placement) {
    return { benefic: 0, malefic: 0 };
  }
  return snapshot.aspects.reduce(
    (result, aspect) => {
      if (aspect.to !== planet && aspect.to !== placement.house) {
        return result;
      }
      if (benefics.has(aspect.from)) {
        result.benefic += 1;
      }
      if (hardMalefics.has(aspect.from)) {
        result.malefic += 1;
      }
      return result;
    },
    { benefic: 0, malefic: 0 },
  );
}

function natalPromiseScore(aspect: DailyAspect, snapshot: ChartSnapshot): ComponentResult {
  const notes: string[] = [];
  let normalized = 0;

  if (aspect === "career") {
    normalized =
      houseStrength(snapshot, "D1", 10, aspect) * 0.2 +
      houseLordStrength(snapshot, "D1", 10, aspect) * 0.25 +
      lagnaLordStrength(snapshot, "D10", aspect) * 0.15 +
      houseLordStrength(snapshot, "D10", 10, aspect) * 0.2 +
      karakaStrength(snapshot, aspect) * 0.2;
    notes.push("Career natal promise uses D1 10th house/lord, D10 lagna/lord, and work karakas.");
  } else if (aspect === "love") {
    normalized =
      houseStrength(snapshot, "D1", 5, aspect) * 0.15 +
      houseLordStrength(snapshot, "D1", 5, aspect) * 0.15 +
      houseStrength(snapshot, "D1", 7, aspect) * 0.2 +
      houseLordStrength(snapshot, "D1", 7, aspect) * 0.2 +
      planetStrength(snapshot, "D1", "Venus", aspect) * 0.15 +
      houseLordStrength(snapshot, "D9", 7, aspect) * 0.1 +
      lagnaLordStrength(snapshot, "D9", aspect) * 0.05;
    notes.push("Love natal promise uses 5th/7th house structure, Venus, and D9 partnership support.");
  } else if (aspect === "emotional") {
    const moonInfluence = influenceOnPlanet(snapshot, "Moon");
    normalized =
      planetStrength(snapshot, "D1", "Moon", aspect) * 0.3 +
      houseStrength(snapshot, "D1", 4, aspect) * 0.15 +
      houseLordStrength(snapshot, "D1", 4, aspect) * 0.15 +
      lagnaLordStrength(snapshot, "D4", aspect) * 0.1 +
      lagnaLordStrength(snapshot, "D30", aspect) * 0.1 +
      clamp((moonInfluence.benefic - moonInfluence.malefic) / 4, -1, 1) * 0.2;
    notes.push("Emotional promise weights Moon, 4th-house security, D4, D30, and benefic/malefic influence on Moon.");
  } else {
    normalized =
      planetStrength(snapshot, "D1", "Mercury", aspect) * 0.25 +
      planetStrength(snapshot, "D1", "Moon", aspect) * 0.15 +
      houseLordStrength(snapshot, "D1", 3, aspect) * 0.15 +
      houseLordStrength(snapshot, "D1", 5, aspect) * 0.15 +
      houseLordStrength(snapshot, "D1", 6, aspect) * 0.1 +
      lagnaLordStrength(snapshot, "D24", aspect) * 0.1 +
      houseLordStrength(snapshot, "D24", 5, aspect) * 0.1;
    notes.push("Focus natal promise uses Mercury, Moon, effort/intelligence/problem-solving houses, and D24.");
  }

  return { score: round1(clamp(normalized * 12, -12, 12)), notes };
}

function birthTimeVargaScale(confidence: BirthTimeConfidence) {
  if (confidence === "exact") {
    return 1;
  }
  if (confidence === "approximate") {
    return 0.78;
  }
  return 0.55;
}

function chartSupportScore(aspect: DailyAspect, snapshot: ChartSnapshot, chartKey: string) {
  const c = chart(snapshot, chartKey);
  if (!c) {
    return undefined;
  }
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  const goodHouses = positiveHouses(aspect);
  const badHouses = cautionHouses(aspect);
  const houseScore = average(goodHouses.slice(0, 4).map((house) => houseStrength(snapshot, chartKey, house, aspect)));
  const planetScore = average(config.planets.map((planet) => planetStrength(snapshot, chartKey, planet, aspect)));
  const badScore = average(badHouses.map((house) => Math.max(0, -houseStrength(snapshot, chartKey, house, aspect))));
  return clamp(houseScore * 0.45 + planetScore * 0.45 - badScore * 0.1, -1, 1);
}

function vargaSupportScore(aspect: DailyAspect, snapshot: ChartSnapshot, confidence: BirthTimeConfidence): ComponentResult {
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  const notes: string[] = [];
  const primary = chartSupportScore(aspect, snapshot, config.primaryVarga);
  const d1 = chartSupportScore(aspect, snapshot, "D1");
  const bhava = chartSupportScore(aspect, snapshot, "Bhava");
  const moon = chartSupportScore(aspect, snapshot, "Moon");
  const supportingEntries = Object.entries(config.charts).filter(([chartKey]) => ![config.primaryVarga, "D1", "Bhava", "Moon", "D60"].includes(chartKey)) as Array<[string, number]>;

  let supportingTotal = 0;
  let supportingWeight = 0;
  for (const [chartKey, weight] of supportingEntries) {
    const support = chartSupportScore(aspect, snapshot, chartKey);
    if (support === undefined) {
      continue;
    }
    supportingTotal += support * weight;
    supportingWeight += weight;
  }

  const baseSupport = average([d1 ?? 0, bhava ?? 0]);
  const moonSupport = moon ?? 0;
  const supporting = supportingWeight > 0 ? supportingTotal / supportingWeight : 0;
  const primaryWeight = config.primaryVarga === "Moon" ? 0.45 : 0.55;
  const baseWeight = config.primaryVarga === "Moon" ? 0.25 : 0.25;
  const moonWeight = config.primaryVarga === "Moon" ? 0.2 : 0.1;
  const supportingWeightFinal = 1 - primaryWeight - baseWeight - moonWeight;
  const normalized =
    (primary ?? 0) * primaryWeight +
    baseSupport * baseWeight +
    moonSupport * moonWeight +
    supporting * supportingWeightFinal;
  const scaled = normalized * 12 * birthTimeVargaScale(confidence);
  notes.push(`${config.primaryVarga} is treated as the decider varga for ${aspect}, not just one chart in a flat average.`);
  if (confidence !== "exact") {
    notes.push(`Divisional chart weight was reduced because birth time confidence is ${confidence}.`);
  }
  return { score: round1(clamp(scaled, -12, 12)), notes };
}

function ownsAnyHouse(snapshot: ChartSnapshot, chartKey: string, planet: Planet, houses: number[]) {
  return houses.some((house) => chartHouseLord(snapshot, chartKey, house) === planet);
}

function occupiesAnyHouse(snapshot: ChartSnapshot, chartKey: string, planet: Planet, houses: number[]) {
  const placement = chartPlanet(snapshot, chartKey, planet);
  return placement ? houses.includes(placement.house) : false;
}

function planetDrishtiHitsHouses(snapshot: ChartSnapshot, chartKey: string, planet: Planet, houses: number[]) {
  const placement = chartPlanet(snapshot, chartKey, planet);
  if (!placement) {
    return false;
  }
  return houses.some((house) => aspectsHouse(placement.house, planet, house));
}

function dashaLordScore(aspect: DailyAspect, snapshot: ChartSnapshot, lord: Planet) {
  const goodHouses = positiveHouses(aspect);
  const badHouses = cautionHouses(aspect);
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  const primaryStrength = planetStrength(snapshot, config.primaryVarga, lord, aspect);
  const d1Strength = planetStrength(snapshot, "D1", lord, aspect);
  const strength = average([primaryStrength, d1Strength]);
  let goodRelevance = 0;
  let badRelevance = 0;

  if (ownsAnyHouse(snapshot, "D1", lord, goodHouses) || ownsAnyHouse(snapshot, "Bhava", lord, goodHouses)) {
    goodRelevance += 0.25;
  }
  if (occupiesAnyHouse(snapshot, "D1", lord, goodHouses) || occupiesAnyHouse(snapshot, "Bhava", lord, goodHouses)) {
    goodRelevance += 0.25;
  }
  if (planetDrishtiHitsHouses(snapshot, "D1", lord, goodHouses)) {
    goodRelevance += 0.2;
  }
  if ((config.planets as readonly Planet[]).includes(lord)) {
    goodRelevance += 0.15;
  }
  if (primaryStrength > 0.15) {
    goodRelevance += 0.15;
  }

  if (ownsAnyHouse(snapshot, "D1", lord, badHouses) || occupiesAnyHouse(snapshot, "D1", lord, badHouses)) {
    badRelevance += 0.35;
  }
  if (primaryStrength < -0.15) {
    badRelevance += 0.2;
  }
  const natal = natalPlacement(snapshot, lord);
  if (natal?.combust || (natal && nodesInfluencePlanet(snapshot, lord) > 0.25)) {
    badRelevance += 0.2;
  }

  const positive = goodRelevance * (0.45 + Math.max(strength, 0) * 0.55);
  const negative = badRelevance * (0.55 + Math.max(-strength, 0) * 0.45);
  return clamp((positive - negative) * 18, -18, 18);
}

function dashaActivationScore(aspect: DailyAspect, snapshot: ChartSnapshot, dashaTiming: DailyScoringDashaTiming): ComponentResult {
  const levels: Array<[DashaTimeline["periods"][number] | undefined, number, string]> = [
    [dashaTiming.active_mahadasha, 0.3, "mahadasha"],
    [dashaTiming.active_antardasha, 0.45, "antardasha"],
    [dashaTiming.active_pratyantardasha, 0.25, "pratyantardasha"],
  ];
  let score = 0;
  const notes: string[] = [];
  for (const [period, weight, label] of levels) {
    if (!period) {
      continue;
    }
    const lordScore = dashaLordScore(aspect, snapshot, period.lord);
    score += lordScore * weight;
    notes.push(`${period.lord} ${label} contributes ${round1(lordScore * weight)} to ${aspect}.`);
  }
  return { score: round1(clamp(score, -18, 18)), notes };
}

function nodesInfluencePlanet(snapshot: ChartSnapshot, planet: Planet) {
  const placement = natalPlacement(snapshot, planet);
  if (!placement) {
    return 0;
  }
  return Math.max(
    ...(["Rahu", "Ketu"] as const).map((node) => {
      const nodePlacement = natalPlacement(snapshot, node);
      return nodePlacement ? orbMultiplier(circularDiff(placement.longitude_deg, nodePlacement.longitude_deg)) : 0;
    }),
  );
}

function addRule(rules: TransitRuleContribution[], rule: TransitRuleContribution) {
  if (Math.abs(rule.delta) < 0.05) {
    return;
  }
  rules.push({ ...rule, delta: round1(rule.delta) });
}

function closeTransitToNatal(transits: TransitSummary, snapshot: ChartSnapshot, transitPlanet: Planet, natalPlanet: Planet) {
  const transit = transitPlacement(transits, transitPlanet);
  const natal = natalPlacement(snapshot, natalPlanet);
  if (!transit || !natal) {
    return { deg: Number.POSITIVE_INFINITY, multiplier: 0 };
  }
  const deg = circularDiff(transit.longitude_deg, natal.longitude_deg);
  return { deg, multiplier: orbMultiplier(deg) };
}

function transitHouse(transits: TransitSummary, planet: Planet) {
  return transitPlacement(transits, planet)?.house;
}

function anyStabilizerForMercury(transits: TransitSummary, snapshot: ChartSnapshot) {
  const jupiter = closeTransitToNatal(transits, snapshot, "Jupiter", "Mercury").multiplier;
  const saturnHouse = transitHouse(transits, "Saturn");
  return jupiter > 0 || (typeof saturnHouse === "number" && [3, 6, 10, 11].includes(saturnHouse));
}

function transitTriggerScore(aspect: DailyAspect, snapshot: ChartSnapshot, transits: TransitSummary): ComponentResult & { rules: TransitRuleContribution[] } {
  const rules: TransitRuleContribution[] = [];
  const goodHouses = positiveHouses(aspect);
  const badHouses = cautionHouses(aspect);
  const config = DAILY_ASPECT_V3_CONFIG[aspect];

  for (const planet of ["Jupiter", "Saturn", "Mars", "Venus", "Mercury", "Rahu", "Ketu"] as const) {
    const transit = transitPlacement(transits, planet);
    if (!transit) {
      continue;
    }
    if (planet === "Jupiter") {
      if (goodHouses.includes(transit.house)) {
        addRule(rules, {
          rule: `jupiter_transit_house_${transit.house}_${aspect}`,
          delta: aspect === "emotional" ? 3 : 4,
          planet,
          house: transit.house,
          note: `Jupiter transits a supportive ${aspect} house.`,
        });
      }
      for (const house of goodHouses) {
        if (aspectsHouse(transit.house, planet, house)) {
          addRule(rules, {
            rule: `jupiter_aspects_house_${house}_${aspect}`,
            delta: 2.5,
            planet,
            house,
            note: `Jupiter aspects house ${house} for ${aspect}.`,
          });
        }
      }
    }

    if (planet === "Saturn") {
      if ((aspect === "career" || aspect === "focus") && [3, 6, 10, 11].includes(transit.house)) {
        addRule(rules, {
          rule: `saturn_upachaya_house_${transit.house}_${aspect}`,
          delta: aspect === "career" && transit.house === 10 ? 3.5 : 3,
          planet,
          house: transit.house,
          note: `Saturn in an upachaya house supports disciplined ${aspect}.`,
        });
      }
      if ((aspect === "love" || aspect === "emotional") && (badHouses.includes(transit.house) || goodHouses.includes(transit.house))) {
        addRule(rules, {
          rule: `saturn_pressure_house_${transit.house}_${aspect}`,
          delta: goodHouses.includes(transit.house) ? -3 : -2.5,
          planet,
          house: transit.house,
          note: `Saturn pressures a sensitive ${aspect} house.`,
        });
      }
    }

    if (planet === "Mars") {
      if ((aspect === "career" || aspect === "focus") && [3, 6].includes(transit.house)) {
        addRule(rules, {
          rule: `mars_execution_house_${transit.house}_${aspect}`,
          delta: 2,
          planet,
          house: transit.house,
          note: `Mars supports competitive execution for ${aspect}.`,
        });
      }
    }

    if (planet === "Venus" && (aspect === "love" || aspect === "emotional") && [1, 4, 5, 7, 9, 11].includes(transit.house)) {
      addRule(rules, {
        rule: `venus_comfort_house_${transit.house}_${aspect}`,
        delta: aspect === "love" ? 3 : 2,
        planet,
        house: transit.house,
        note: `Venus transits a supportive house for ${aspect}.`,
      });
    }

    if (planet === "Mercury" && (aspect === "career" || aspect === "focus")) {
      const mercuryStrength = dignityScore(transit.dignity);
      if (mercuryStrength > 0 && goodHouses.includes(transit.house)) {
        addRule(rules, {
          rule: `mercury_strong_house_${transit.house}_${aspect}`,
          delta: 2 + mercuryStrength / 4,
          planet,
          house: transit.house,
          note: `Mercury is strong enough to support ${aspect}.`,
        });
      }
      if (transit.combust || (transit.retrograde && nodesInfluencePlanet(snapshot, "Mercury") > 0)) {
        addRule(rules, {
          rule: `mercury_unstable_${aspect}`,
          delta: -2.5,
          planet,
          house: transit.house,
          note: `Mercury is unstable for clean ${aspect}.`,
        });
      }
    }
  }

  for (const relevantPlanet of config.planets) {
    for (const transitPlanet of ["Jupiter", "Saturn", "Mars", "Rahu", "Ketu"] as const) {
      const close = closeTransitToNatal(transits, snapshot, transitPlanet, relevantPlanet);
      if (close.multiplier <= 0) {
        continue;
      }
      if (transitPlanet === "Jupiter") {
        addRule(rules, {
          rule: `jupiter_near_natal_${relevantPlanet.toLowerCase()}_${aspect}`,
          delta: 3.5 * close.multiplier,
          planet: transitPlanet,
          note: `Jupiter is within ${round1(close.deg)} degrees of natal ${relevantPlanet}.`,
        });
      } else {
        const base = transitPlanet === "Saturn" ? -5 : nodes.has(transitPlanet) ? -5.5 : -3.5;
        addRule(rules, {
          rule: `${transitPlanet.toLowerCase()}_near_natal_${relevantPlanet.toLowerCase()}_${aspect}`,
          delta: base * close.multiplier,
          planet: transitPlanet,
          note: `${transitPlanet} is within ${round1(close.deg)} degrees of natal ${relevantPlanet}.`,
        });
      }
    }
  }

  if (aspect === "emotional") {
    const saturnMoon = closeTransitToNatal(transits, snapshot, "Saturn", "Moon").deg;
    if (saturnMoon <= 1) {
      addRule(rules, { rule: "saturn_exact_natal_moon_emotional", delta: -8, planet: "Saturn", note: "Saturn is within 1 degree of natal Moon." });
    } else if (saturnMoon <= 2) {
      addRule(rules, { rule: "saturn_close_natal_moon_emotional", delta: -6, planet: "Saturn", note: "Saturn is within 2 degrees of natal Moon." });
    } else if (saturnMoon <= 3) {
      addRule(rules, { rule: "saturn_near_natal_moon_emotional", delta: -4, planet: "Saturn", note: "Saturn is within 3 degrees of natal Moon." });
    }

    for (const node of ["Rahu", "Ketu"] as const) {
      const nodeMoon = closeTransitToNatal(transits, snapshot, node, "Moon").deg;
      if (nodeMoon <= 1) {
        addRule(rules, { rule: `${node.toLowerCase()}_exact_natal_moon_emotional`, delta: -8, planet: node, note: `${node} is within 1 degree of natal Moon.` });
      } else if (nodeMoon <= 2) {
        addRule(rules, { rule: `${node.toLowerCase()}_close_natal_moon_emotional`, delta: -6, planet: node, note: `${node} is within 2 degrees of natal Moon.` });
      } else if (nodeMoon <= 3) {
        addRule(rules, { rule: `${node.toLowerCase()}_near_natal_moon_emotional`, delta: -4, planet: node, note: `${node} is within 3 degrees of natal Moon.` });
      }
    }
  }

  if (aspect === "love") {
    const marsVenus = closeTransitToNatal(transits, snapshot, "Mars", "Venus").multiplier;
    if (marsVenus > 0) {
      const saturnVenus = closeTransitToNatal(transits, snapshot, "Saturn", "Venus").multiplier;
      const rahuVenus = Math.max(closeTransitToNatal(transits, snapshot, "Rahu", "Venus").multiplier, closeTransitToNatal(transits, snapshot, "Ketu", "Venus").multiplier);
      addRule(rules, {
        rule: "mars_venus_attraction_love",
        delta: saturnVenus > 0 || rahuVenus > 0 ? 1 : 2,
        planet: "Mars",
        note: "Mars activates Venus, increasing attraction but requiring restraint.",
      });
    }
  }

  if (aspect === "focus") {
    const rahuMercury = Math.max(closeTransitToNatal(transits, snapshot, "Rahu", "Mercury").multiplier, closeTransitToNatal(transits, snapshot, "Ketu", "Mercury").multiplier);
    if (rahuMercury > 0) {
      addRule(rules, {
        rule: "node_mercury_focus_instability",
        delta: anyStabilizerForMercury(transits, snapshot) ? -1.5 : -4,
        planet: "Rahu",
        note: "The nodal axis influences Mercury, raising scatter or obsessive thinking risk.",
      });
    }
  }

  const score = round1(clamp(rules.reduce((sum, rule) => sum + rule.delta, 0), -16, 16));
  const topNotes = rules
    .slice()
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 5)
    .map((rule) => rule.note);
  return { score, notes: unique(topNotes), rules };
}

function dailyMoonScore(aspect: DailyAspect, snapshot: ChartSnapshot, transits: TransitSummary): ComponentResult {
  const moon = transitPlacement(transits, "Moon");
  const natalMoon = natalPlacement(snapshot, "Moon");
  if (!moon || !natalMoon) {
    return { score: 0, notes: [] };
  }
  const fromLagna = moon.house;
  const fromNatalMoon = houseOfSign(moon.sign, natalMoon.sign);
  const goodFromMoon = [1, 3, 6, 7, 10, 11];
  const badFromMoon = [4, 8, 12];
  const good = aspect === "emotional" ? [1, 4, 5, 9, 11] : positiveHouses(aspect);
  const bad = aspect === "focus" ? [8, 12] : aspect === "love" ? [6, 8, 12] : cautionHouses(aspect);
  let score = 0;
  const notes: string[] = [];

  if (good.includes(fromLagna)) {
    score += aspect === "career" || aspect === "focus" ? 2.3 : 1.8;
    notes.push(`Moon is in house ${fromLagna} from lagna for ${aspect}.`);
  }
  if (bad.includes(fromLagna)) {
    score -= aspect === "emotional" || aspect === "focus" ? 3 : 2;
    notes.push(`Moon is in a caution house ${fromLagna} from lagna for ${aspect}.`);
  }
  if (goodFromMoon.includes(fromNatalMoon)) {
    score += aspect === "emotional" ? 2.2 : 1.3;
    notes.push(`Chandra bala is supportive because Moon is ${fromNatalMoon} from natal Moon.`);
  }
  if (badFromMoon.includes(fromNatalMoon)) {
    score -= aspect === "emotional" ? 3.2 : 1.8;
    notes.push(`Chandra bala is weak because Moon is ${fromNatalMoon} from natal Moon.`);
  }

  const taraDelta = taraBalaDelta(natalMoon.nakshatra, moon.nakshatra);
  if (taraDelta !== 0) {
    const adjustedTara = aspect === "emotional" || aspect === "focus" ? taraDelta : taraDelta * 0.65;
    score += adjustedTara;
    notes.push(`Tara bala modifies the daily Moon score by ${round1(adjustedTara)}.`);
  }

  return { score: round1(clamp(score, -8, 8)), notes };
}

function yogaModifierScore(aspect: DailyAspect, snapshot: ChartSnapshot): ComponentResult {
  let score = 0;
  const notes: string[] = [];
  const relevant = new Set<Planet>(DAILY_ASPECT_V3_CONFIG[aspect].planets);

  for (const yoga of snapshot.yogas) {
    const confidence = yoga.confidence === "high" ? 3 : yoga.confidence === "medium" ? 2 : 1;
    const overlaps = yoga.planets_involved.some((planet) => relevant.has(planet));
    const delta = yogaDelta(aspect, yoga, confidence, overlaps);
    if (delta === 0) {
      continue;
    }
    score += delta;
    notes.push(`${yoga.name} modifies ${aspect} by ${round1(delta)}.`);
  }

  return { score: round1(clamp(score, -8, 8)), notes: notes.slice(0, 5) };
}

function yogaDelta(aspect: DailyAspect, yoga: Yoga, confidence: number, overlaps: boolean) {
  if (yoga.name === "Kemadruma") {
    return aspect === "emotional" ? -4 : aspect === "love" || aspect === "focus" ? -2 : 0;
  }
  if (yoga.name === "Gajakesari") {
    return aspect === "emotional" ? confidence : aspect === "love" || aspect === "focus" ? confidence * 0.6 : confidence * 0.4;
  }
  if (yoga.name === "Raja Yoga") {
    return aspect === "career" || aspect === "focus" ? confidence * (overlaps ? 1 : 0.6) : overlaps ? confidence * 0.4 : 0;
  }
  if (yoga.name === "Dhana Yoga") {
    return aspect === "career" ? confidence * 0.8 : aspect === "focus" ? confidence * 0.3 : 0;
  }
  if (yoga.name === "Neechabhanga Raja Yoga") {
    return overlaps ? confidence * 0.8 : confidence * 0.3;
  }
  return overlaps ? confidence * 0.3 : 0;
}

function volatilityPenalty(aspect: DailyAspect, snapshot: ChartSnapshot, transits: TransitSummary, rules: TransitRuleContribution[]): ComponentResult {
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  let penalty = 0;
  const notes: string[] = [];

  for (const planet of config.planets) {
    for (const transitPlanet of ["Rahu", "Ketu", "Saturn", "Mars"] as const) {
      const close = closeTransitToNatal(transits, snapshot, transitPlanet, planet);
      if (close.multiplier <= 0) {
        continue;
      }
      const severity = nodes.has(transitPlanet) ? 5 : transitPlanet === "Saturn" ? 3.5 : 3;
      penalty += severity * close.multiplier;
      notes.push(`${transitPlanet} close to natal ${planet} adds instability.`);
    }
  }

  for (const rule of rules) {
    if (rule.rule.includes("rahu") || rule.rule.includes("ketu") || rule.rule.includes("unstable") || rule.rule.includes("mars_venus")) {
      penalty += Math.min(2.5, Math.abs(rule.delta) * 0.45);
    }
  }

  if (aspect === "career" && transitHouse(transits, "Rahu") === 10) {
    penalty += 2;
    notes.push("Rahu in the 10th can bring ambition with volatility.");
  }
  if (aspect === "focus") {
    const rahuMercury = Math.max(closeTransitToNatal(transits, snapshot, "Rahu", "Mercury").multiplier, closeTransitToNatal(transits, snapshot, "Ketu", "Mercury").multiplier);
    if (rahuMercury > 0 && anyStabilizerForMercury(transits, snapshot)) {
      penalty += 2;
      notes.push("Rahu-Mercury influence has some stabilizing support but remains irregular.");
    }
  }

  return { score: round1(clamp(penalty, 0, 12)), notes: unique(notes).slice(0, 5) };
}


function relationToAspectHouses(snapshot: ChartSnapshot, planet: Planet, aspect: DailyAspect) {
  const houses = positiveHouses(aspect);
  return (
    ownsAnyHouse(snapshot, "D1", planet, houses) ||
    occupiesAnyHouse(snapshot, "D1", planet, houses) ||
    planetDrishtiHitsHouses(snapshot, "D1", planet, houses) ||
    ownsAnyHouse(snapshot, DAILY_ASPECT_V3_CONFIG[aspect].primaryVarga, planet, houses) ||
    occupiesAnyHouse(snapshot, DAILY_ASPECT_V3_CONFIG[aspect].primaryVarga, planet, houses)
  );
}

function dashaSupportsAspect(aspect: DailyAspect, snapshot: ChartSnapshot, dashaTiming: DailyScoringDashaTiming) {
  const lords = activeDashaLords(dashaTiming);
  if (lords.length === 0) {
    return false;
  }
  return lords.some((lord) => relationToAspectHouses(snapshot, lord, aspect) || (DAILY_ASPECT_V3_CONFIG[aspect].planets as readonly Planet[]).includes(lord));
}

function applyHardCaps(
  aspect: DailyAspect,
  snapshot: ChartSnapshot,
  transits: TransitSummary,
  dasha: ComponentResult,
  natal: ComponentResult,
  varga: ComponentResult,
  raw: number,
  dashaTiming: DailyScoringDashaTiming,
): ComponentResult {
  let capped = raw;
  const notes: string[] = [];
  const natalMoon = natalPlacement(snapshot, "Moon");
  const transitMoon = transitPlacement(transits, "Moon");
  const transitSaturnHouse = transitHouse(transits, "Saturn");
  const transitRahuHouse = transitHouse(transits, "Rahu");
  const transitKetuHouse = transitHouse(transits, "Ketu");

  if (dasha.score < -10) {
    capped = Math.min(capped, 52);
    notes.push("Hard cap applied: active dasha is strongly unsupportive, so transit cannot create a genuinely strong day.");
  } else if (dasha.score < -6) {
    capped = Math.min(capped, 62);
    notes.push("Soft cap applied: active dasha is weak, so the score is capped even if transits look helpful.");
  }

  if (!dashaSupportsAspect(aspect, snapshot, dashaTiming) && raw > 68) {
    capped = Math.min(capped, 68);
    notes.push("Activation cap applied: dasha lords do not clearly activate the houses/karakas for this aspect.");
  }

  if (natal.score + varga.score < -10) {
    capped = Math.min(capped, 58);
    notes.push("Natal/varga cap applied: weak base promise should not be overridden by one-day transits.");
  }

  if (aspect === "emotional" && natalMoon?.dignity === "debilitated" && transitMoon && [8, 12].includes(houseOfSign(transitMoon.sign, natalMoon.sign))) {
    capped = Math.min(capped, 50);
    notes.push("Emotional cap applied: debilitated natal Moon plus difficult daily Moon transit.");
  }

  if (aspect === "love") {
    const venusAfflicted =
      closeTransitToNatal(transits, snapshot, "Saturn", "Venus").multiplier > 0 ||
      closeTransitToNatal(transits, snapshot, "Rahu", "Venus").multiplier > 0 ||
      closeTransitToNatal(transits, snapshot, "Ketu", "Venus").multiplier > 0;
    const relationshipHousePressure = [5, 7].some((house) => transitSaturnHouse === house || transitRahuHouse === house || transitKetuHouse === house);
    if (venusAfflicted && relationshipHousePressure) {
      capped = Math.min(capped, 54);
      notes.push("Love cap applied: Venus and relationship houses are both under pressure.");
    }
  }

  if (aspect === "focus") {
    const mercuryNode = Math.max(closeTransitToNatal(transits, snapshot, "Rahu", "Mercury").multiplier, closeTransitToNatal(transits, snapshot, "Ketu", "Mercury").multiplier);
    const moonWeak = natalMoon?.dignity === "debilitated" || (transitMoon ? [8, 12].includes(houseOfSign(transitMoon.sign, natalMoon?.sign ?? transitMoon.sign)) : false);
    if (mercuryNode > 0 && moonWeak) {
      capped = Math.min(capped, 60);
      notes.push("Focus cap applied: Mercury-node instability with weak Moon support.");
    }
  }

  if (aspect === "career" && raw > 70 && !dashaSupportsAspect(aspect, snapshot, dashaTiming)) {
    capped = Math.min(capped, 64);
    notes.push("Career cap applied: visible career progress needs dasha activation, not transit alone.");
  }

  return { score: round1(clamp(capped, 0, 100)), notes };
}

function realityVector(
  aspect: DailyAspect,
  natal: ComponentResult,
  dasha: ComponentResult,
  varga: ComponentResult,
  transit: ComponentResult,
  moon: ComponentResult,
  yoga: ComponentResult,
  volatility: ComponentResult,
  capped: ComponentResult,
): RealityVector {
  const opportunity = clamp(Math.round((50 + natal.score * 0.6 + dasha.score * 1.1 + varga.score * 0.5 + transit.score + yoga.score * 0.4) / 10), 1, 10);
  const ease = clamp(Math.round((55 + moon.score * 1.2 + yoga.score * 0.5 - volatility.score * 1.4 + Math.min(dasha.score, 0) * 0.6) / 10), 1, 10);
  const risk = clamp(Math.round((volatility.score * 1.35 + Math.max(0, -dasha.score) * 0.45 + Math.max(0, -capped.score + 65) * 0.08) / 1.8), 1, 10);
  const contradiction = Math.abs(dasha.score - transit.score) + Math.abs(natal.score - varga.score);
  const confidence: RealityVector["confidence"] = contradiction < 10 && capped.notes.length === 0 ? "high" : contradiction < 18 ? "medium" : "low";
  const notes = [
    `${aspect} reality vector: opportunity ${opportunity}/10, ease ${ease}/10, risk ${risk}/10, confidence ${confidence}.`,
  ];
  if (opportunity >= 7 && ease <= 5) {
    notes.push("This is an action-supported day, not necessarily a comfortable day.");
  }
  if (risk >= 7) {
    notes.push("Risk is high enough that the score should be read with restraint, not blind optimism.");
  }
  return { opportunity, ease, risk, confidence, notes };
}

function scoreAspect(aspect: DailyAspect, input: DailyScoringInput): ScoredAspect {
  const natal = natalPromiseScore(aspect, input.snapshot);
  const dasha = dashaActivationScore(aspect, input.snapshot, input.dashaTiming);
  const varga = vargaSupportScore(aspect, input.snapshot, input.birthTimeConfidence);
  const transit = transitTriggerScore(aspect, input.snapshot, input.transits);
  const moon = dailyMoonScore(aspect, input.snapshot, input.transits);
  const yoga = yogaModifierScore(aspect, input.snapshot);
  const volatility = volatilityPenalty(aspect, input.snapshot, input.transits, transit.rules);
  const baseRaw = clamp(
    45 + natal.score * 0.8 + dasha.score * 1.2 + varga.score * 0.5 + transit.score * 0.7 + moon.score + yoga.score * 0.5 - volatility.score * 1.1,
    0,
    100,
  );
  const capped = applyHardCaps(aspect, input.snapshot, input.transits, dasha, natal, varga, baseRaw, input.dashaTiming);
  const raw = capped.score;
  const reality = realityVector(aspect, natal, dasha, varga, transit, moon, yoga, volatility, capped);
  const score = clamp(Math.round(raw), 1, 100);
  const label = dailyScoreLabel(score);
  const config = DAILY_ASPECT_V3_CONFIG[aspect];
  const ruleNames = unique(transit.rules.map((rule) => rule.rule)).slice(0, 6);
  const rulePlanets = transit.rules.flatMap((rule) => (rule.planet ? [rule.planet] : []));
  const ruleHouses = transit.rules.flatMap((rule) => (typeof rule.house === "number" ? [rule.house] : []));
  const houses = unique([...configuredHouses(config, ["primary"]), ...positiveHouses(aspect), ...ruleHouses]).slice(0, 6);
  const planets = unique([...config.planets, ...activeDashaLords(input.dashaTiming), ...rulePlanets]).slice(0, 6);
  const notes = unique([
    ...natal.notes,
    ...dasha.notes.slice(0, 3),
    ...varga.notes,
    ...transit.notes,
    ...moon.notes,
    ...yoga.notes,
    ...volatility.notes,
    ...capped.notes,
    ...reality.notes,
  ]).slice(0, 12);

  return {
    aspectScore: {
      aspect,
      score,
      label,
      sentence: dailyAspectSentence(aspect, label),
      basis: {
        houses,
        planets,
        transit_rules: ruleNames,
      },
    },
    breakdown: {
      aspect,
      raw_score: round1(raw),
      components: {
        natal_promise: natal.score,
        dasha_activation: dasha.score,
        varga_support: varga.score,
        transit_trigger: transit.score,
        daily_moon: moon.score,
        yoga_modifier: yoga.score,
        volatility_penalty: volatility.score,
      },
      source_charts: Object.keys(config.charts).filter((chartKey) => Boolean(chart(input.snapshot, chartKey))).slice(0, 8),
      notes,
    },
    rules: transit.rules,
    planets,
    houses,
  };
}

function activeDashaLords(dashaTiming: DailyScoringDashaTiming) {
  return [
    dashaTiming.active_mahadasha?.lord,
    dashaTiming.active_antardasha?.lord,
    dashaTiming.active_pratyantardasha?.lord,
  ].filter((planet): planet is Planet => Boolean(planet));
}

export function scoreDailyAspectsV3(input: DailyScoringInput): DailyScoringResult {
  const aspects = DailyAspectSchema.options as DailyAspect[];
  const scored = aspects.map((aspect) => scoreAspect(aspect, input));
  return {
    aspect_scores: scored.map((entry) => entry.aspectScore),
    score_breakdown: scored.map((entry) => entry.breakdown),
    basis: {
      houses: unique(scored.flatMap((entry) => entry.houses)).sort((left, right) => left - right),
      planets: unique(scored.flatMap((entry) => entry.planets)),
      transit_rules: unique(scored.flatMap((entry) => entry.rules.map((rule) => rule.rule))),
    },
  };
}
