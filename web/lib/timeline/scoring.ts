import {
  LifeAreaTimingPointSchema,
  LifeAreaTimingSeriesSchema,
  type ChartSnapshot,
  type DerivedFeaturePayload,
  type DashaTimeline,
  type LifeAreaTimingFactor,
  type LifeAreaTimingPoint,
  type LifeAreaTimingSeries,
  type LifeAreaTimingTopic as SchemaLifeAreaTimingTopic,
  type Planet,
  type PlanetPlacement,
  type Topic,
  type TopicBundle,
  type TopicEvidenceCitation,
  type TransitSummary,
} from "@/lib/schemas";
import {
  houseLordRule,
  lagnaLordRule,
  lordOfHouse,
  namedPlanet,
  ordinal,
  topicTitles,
  type TopicBlueprint,
} from "@/lib/derived/shared";
import { topicBlueprints } from "@/lib/derived/topics";

const standardLifeAreaTimingTopics = [
  "career",
  "wealth",
  "relationships",
  "marriage",
  "family",
  "health",
  "education",
  "spirituality",
  "relocation",
] as const satisfies readonly Topic[];

export const lifeAreaTimingTopics = [
  ...standardLifeAreaTimingTopics,
  "emotional",
] as const satisfies readonly SchemaLifeAreaTimingTopic[];

export const LIFE_AREA_TIMING_SCORING_VERSION = "life_area_timing_v2_structured_rules";

export type LifeAreaTimingTopic = SchemaLifeAreaTimingTopic;
type StandardLifeAreaTimingTopic = (typeof standardLifeAreaTimingTopics)[number];
type TimingTopicBundle = Pick<TopicBundle, "charts_used" | "headline_signals" | "houses" | "planets" | "timing" | "confidence_note">;
type TimingBlueprint = Pick<TopicBlueprint, "chartsUsed" | "housesUsed" | "planetRules">;

export type LifeAreaDashaTiming = {
  system: "vimshottari";
  active_mahadasha?: DashaTimeline["periods"][number];
  active_antardasha?: DashaTimeline["periods"][number];
  active_pratyantardasha?: DashaTimeline["periods"][number];
};

export type ScoreLifeAreaTimingInput = {
  snapshot: ChartSnapshot;
  bundle: TimingTopicBundle;
  topic: LifeAreaTimingTopic;
  date: string;
  transits: TransitSummary;
  dashaTiming: LifeAreaDashaTiming;
  birthTimeConfidence: "exact" | "approximate" | "unknown";
};

type InternalTimingFactor = LifeAreaTimingFactor & { impact: number };

const benefics = new Set<Planet>(["Jupiter", "Venus", "Mercury", "Moon"]);
const hardMalefics = new Set<Planet>(["Mars", "Saturn", "Rahu", "Ketu"]);
const strongDignities = new Set<PlanetPlacement["dignity"]>(["exalted", "moolatrikona", "own", "friendly"]);
const weakDignities = new Set<PlanetPlacement["dignity"]>(["enemy", "debilitated"]);
const difficultHouses = new Set([6, 8, 12]);
const upachayaHouses = new Set([3, 6, 10, 11]);

const emotionalTimingBlueprint: TimingBlueprint = {
  chartsUsed: ["D1", "Moon", "D4", "D30"],
  housesUsed: [1, 4, 5, 8, 12],
  planetRules: [
    lagnaLordRule("Self ruler"),
    houseLordRule(4, "Inner-base lord"),
    houseLordRule(5, "Emotional expression lord"),
    namedPlanet("Moon", "Felt sense"),
    namedPlanet("Venus", "Comfort"),
    namedPlanet("Mercury", "Mental processing"),
  ],
};

const timingBlueprints: Record<LifeAreaTimingTopic, TimingBlueprint> = {
  career: topicBlueprints.career,
  wealth: topicBlueprints.wealth,
  relationships: topicBlueprints.relationships,
  marriage: topicBlueprints.marriage,
  family: topicBlueprints.family,
  health: topicBlueprints.health,
  education: topicBlueprints.education,
  spirituality: topicBlueprints.spirituality,
  relocation: topicBlueprints.relocation,
  emotional: emotionalTimingBlueprint,
};

export const lifeAreaTimingTopicTitles: Record<LifeAreaTimingTopic, string> = {
  career: topicTitles.career,
  wealth: topicTitles.wealth,
  relationships: topicTitles.relationships,
  marriage: topicTitles.marriage,
  family: topicTitles.family,
  health: topicTitles.health,
  education: topicTitles.education,
  spirituality: topicTitles.spirituality,
  relocation: topicTitles.relocation,
  emotional: "Emotional",
};

const topicTimingCopy: Record<LifeAreaTimingTopic, { noun: string; action: string; caution: string }> = {
  career: {
    noun: "career",
    action: "visible output and responsibility",
    caution: "career pressure, delay, or cleanup",
  },
  wealth: {
    noun: "wealth",
    action: "earning, saving, and resource building",
    caution: "spending pressure or unstable gains",
  },
  relationships: {
    noun: "relationships",
    action: "connection, repair, and emotional exchange",
    caution: "conflict, distance, or expectation pressure",
  },
  marriage: {
    noun: "marriage",
    action: "commitment, reliability, and partnership structure",
    caution: "commitment pressure or partner friction",
  },
  family: {
    noun: "family",
    action: "home stability, care, and domestic responsibility",
    caution: "family tension or inherited pressure",
  },
  health: {
    noun: "health",
    action: "routine, recovery, and maintenance",
    caution: "stress, depletion, or irregularity",
  },
  education: {
    noun: "education",
    action: "study, concentration, and skill-building",
    caution: "distraction or learning inconsistency",
  },
  spirituality: {
    noun: "spirituality",
    action: "practice, guidance, and inner discipline",
    caution: "escapism, isolation, or unclear faith direction",
  },
  relocation: {
    noun: "relocation",
    action: "movement, planning, and foreign links",
    caution: "displacement pressure or unsettled foundations",
  },
  emotional: {
    noun: "emotional state",
    action: "self-regulation, comfort, and recovery",
    caution: "emotional heaviness, restlessness, or sensitivity",
  },
};

export function isLifeAreaTimingTopic(topic: string): topic is LifeAreaTimingTopic {
  return lifeAreaTimingTopics.includes(topic as LifeAreaTimingTopic);
}

function isStandardLifeAreaTimingTopic(topic: LifeAreaTimingTopic): topic is StandardLifeAreaTimingTopic {
  return standardLifeAreaTimingTopics.includes(topic as StandardLifeAreaTimingTopic);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function citations(input: {
  charts?: string[];
  houses?: number[];
  planets?: Planet[];
}): TopicEvidenceCitation {
  return {
    charts: unique(input.charts ?? []),
    houses: unique(input.houses ?? []).sort((left, right) => left - right),
    planets: unique(input.planets ?? []),
  };
}

function addFactor(
  factors: InternalTimingFactor[],
  input: Omit<InternalTimingFactor, "citations"> & { citations: TopicEvidenceCitation },
) {
  factors.push(input);
}

function natalPlacement(snapshot: ChartSnapshot, planet: Planet) {
  return snapshot.planetary_positions.find((entry) => entry.planet === planet);
}

function d1House(snapshot: ChartSnapshot, house: number) {
  return snapshot.charts.D1?.houses.find((entry) => entry.house === house);
}

function d1Occupants(snapshot: ChartSnapshot, house: number) {
  return snapshot.charts.D1?.planets.filter((entry) => entry.house === house).map((entry) => entry.planet) ?? [];
}

function formatList(values: string[]) {
  if (values.length === 0) {
    return "";
  }
  if (values.length === 1) {
    return values[0] ?? "";
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function dignityText(dignity: PlanetPlacement["dignity"]) {
  switch (dignity) {
    case "exalted":
      return "exalted";
    case "moolatrikona":
      return "in moolatrikona";
    case "own":
      return "in its own sign";
    case "friendly":
      return "in a friendly sign";
    case "neutral":
      return "in neutral dignity";
    case "enemy":
      return "in an enemy sign";
    case "debilitated":
      return "debilitated";
  }
}

function hasHardAspectToHouse(snapshot: ChartSnapshot, house: number, occupants: Planet[]) {
  return snapshot.aspects.some((aspect) => {
    if (!hardMalefics.has(aspect.from)) {
      return false;
    }
    return typeof aspect.to === "number" ? aspect.to === house : occupants.includes(aspect.to);
  });
}

function timingHouseStrength(snapshot: ChartSnapshot, house: number) {
  const houseEntry = d1House(snapshot, house);
  const lordPlacement = houseEntry ? natalPlacement(snapshot, houseEntry.lord) : undefined;
  const occupants = d1Occupants(snapshot, house);
  const hasBeneficOccupant = occupants.some((planet) => benefics.has(planet));
  const hasMaleficOccupant = occupants.some((planet) => hardMalefics.has(planet));
  const hasHardAspect = hasHardAspectToHouse(snapshot, house, occupants);
  const lordStrong = lordPlacement ? strongDignities.has(lordPlacement.dignity) && !lordPlacement.combust : false;
  const lordWeak = lordPlacement
    ? weakDignities.has(lordPlacement.dignity) || difficultHouses.has(lordPlacement.house) || lordPlacement.combust
    : true;

  if ((hasBeneficOccupant || lordStrong) && !hasHardAspect && !lordWeak) {
    return "high" as const;
  }
  if ((hasMaleficOccupant || hasHardAspect || difficultHouses.has(house)) && lordWeak) {
    return "low" as const;
  }
  return "medium" as const;
}

const emotionalHouseThemes: Record<number, string> = {
  1: "self-state and body-mind baseline",
  4: "inner peace, safety, and comfort",
  5: "emotional expression and joy",
  8: "intensity, vulnerability, and emotional churn",
  12: "rest, release, sleep, and private processing",
};

function emotionalHouseSummary(snapshot: ChartSnapshot, house: number, strength: "low" | "medium" | "high") {
  const houseEntry = d1House(snapshot, house);
  const lordPlacement = houseEntry ? natalPlacement(snapshot, houseEntry.lord) : undefined;
  const occupants = d1Occupants(snapshot, house);
  const theme = emotionalHouseThemes[house] ?? "emotional context";
  const occupantText = occupants.length > 0 ? `occupied by ${formatList(occupants)}` : "without direct planetary occupation";
  const strengthText =
    strength === "high" ? "supportive" : strength === "low" ? "under strain" : "mixed and situational";

  if (!houseEntry || !lordPlacement) {
    return `${ordinal(house)} house (${theme}) is part of the emotional timing read, but its D1 lord placement is unavailable.`;
  }

  return `${ordinal(house)} house (${theme}) is ${houseEntry.sign}, ruled by ${houseEntry.lord} placed in the ${ordinal(lordPlacement.house)} house in ${lordPlacement.sign}, ${occupantText}; the emotional signal is ${strengthText}.`;
}

function resolveTimingPlanetRules(snapshot: ChartSnapshot, blueprint: TimingBlueprint) {
  const roles = new Map<Planet, string[]>();
  for (const rule of blueprint.planetRules) {
    const planet = "planet" in rule ? rule.planet : rule.resolve(snapshot);
    const labels = roles.get(planet) ?? [];
    if (!labels.includes(rule.label)) {
      labels.push(rule.label);
    }
    roles.set(planet, labels);
  }
  return roles;
}

function emotionalPlanetSummary(snapshot: ChartSnapshot, planet: Planet, roleLabels: string[]) {
  const placement = natalPlacement(snapshot, planet);
  const roleText = roleLabels.length > 0 ? roleLabels.join(" / ") : planet;
  if (!placement) {
    return `${roleText} uses ${planet}, but the natal placement is unavailable.`;
  }
  const modifiers = [placement.retrograde ? "retrograde" : "", placement.combust ? "combust" : ""].filter(Boolean);
  const modifierText = modifiers.length > 0 ? `, ${formatList(modifiers)}` : "";
  return `${roleText} ${planet} is in ${placement.sign} in the ${ordinal(placement.house)} house with ${dignityText(placement.dignity)}${modifierText}.`;
}

function matchesTimingHighlight(note: string, housesUsed: number[], planetsUsed: Planet[]) {
  const mentionsHouse = housesUsed.some((house) => new RegExp(`\\b${house}(?:st|nd|rd|th)?\\s+house\\b`, "i").test(note));
  const mentionsPlanet = planetsUsed.some((planet) => new RegExp(`\\b${planet}\\b`, "i").test(note));
  return mentionsHouse || mentionsPlanet;
}

export function buildEmotionalTimingBundle(snapshot: ChartSnapshot): TimingTopicBundle {
  const blueprint = emotionalTimingBlueprint;
  const houses = blueprint.housesUsed.reduce<TopicBundle["houses"]>((result, house) => {
    const strength = timingHouseStrength(snapshot, house);
    result[house] = {
      strength,
      summary: emotionalHouseSummary(snapshot, house, strength),
    };
    return result;
  }, {});
  const resolvedRoles = resolveTimingPlanetRules(snapshot, blueprint);
  const planets = Array.from(resolvedRoles.entries()).reduce<TopicBundle["planets"]>((result, [planet, roleLabels]) => {
    result[planet] = {
      role: roleLabels.join(" / "),
      summary: emotionalPlanetSummary(snapshot, planet, roleLabels),
    };
    return result;
  }, {});
  const planetKeys = Object.keys(planets) as Planet[];
  const currentTriggerNotes = snapshot.transits.highlights
    .filter((note) => matchesTimingHighlight(note, blueprint.housesUsed, planetKeys))
    .slice(0, 3);
  const houseEntries = Object.entries(houses)
    .map(([house, value]) => ({ house: Number(house), ...value }))
    .sort((left, right) => {
      const score = { high: 2, medium: 1, low: 0 };
      return score[right.strength] - score[left.strength];
    });
  const strongestHouse = houseEntries.find((entry) => entry.strength === "high") ?? houseEntries[0];
  const stressedHouse = houseEntries.find((entry) => entry.strength === "low");

  return {
    charts_used: blueprint.chartsUsed,
    headline_signals: [
      strongestHouse ? `Emotional steadiness is read first through the ${ordinal(strongestHouse.house)} house.` : "",
      stressedHouse ? `${ordinal(stressedHouse.house)}-house pressure can make feelings less settled.` : "",
      "Moon, Lagna, and the 4th house anchor this self-focused timing read.",
      currentTriggerNotes[0] ?? "",
    ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index),
    houses,
    planets,
    timing: {
      current_mahadasha: `${snapshot.dasha.current_mahadasha.lord} (${snapshot.dasha.current_mahadasha.start} -> ${snapshot.dasha.current_mahadasha.end})`,
      current_antardasha: `${snapshot.dasha.current_antardasha.lord} (${snapshot.dasha.current_antardasha.start} -> ${snapshot.dasha.current_antardasha.end})`,
      current_trigger_notes: currentTriggerNotes,
    },
    confidence_note:
      snapshot.birth_time_confidence === "exact"
        ? "Birth time is exact, so Lagna and house-based emotional timing are usable with normal confidence."
        : "Birth time is not exact, so emotional timing should lean more on Moon, dasha, and broad transit contact than precise house changes.",
  };
}

export function timingBundleForTopic(input: {
  snapshot: ChartSnapshot;
  derived: DerivedFeaturePayload;
  topic: LifeAreaTimingTopic;
}): TimingTopicBundle {
  if (input.topic === "emotional") {
    return buildEmotionalTimingBundle(input.snapshot);
  }
  if (isStandardLifeAreaTimingTopic(input.topic)) {
    return input.derived.topic_bundles[input.topic];
  }
  return input.derived.topic_bundles.career;
}

function housesOwnedBy(snapshot: ChartSnapshot, planet: Planet) {
  return snapshot.charts.D1?.houses.filter((entry) => entry.lord === planet).map((entry) => entry.house) ?? [];
}

function advanceHouse(house: number, offset: number) {
  return ((house + offset - 1) % 12) + 1;
}

function aspectHousesFrom(house: number, planet: Planet) {
  const houses = [advanceHouse(house, 6)];
  if (planet === "Mars") {
    houses.push(advanceHouse(house, 3), advanceHouse(house, 7));
  }
  if (planet === "Jupiter" || planet === "Rahu" || planet === "Ketu") {
    houses.push(advanceHouse(house, 4), advanceHouse(house, 8));
  }
  if (planet === "Saturn") {
    houses.push(advanceHouse(house, 2), advanceHouse(house, 9));
  }
  return unique(houses);
}

function circularDiff(left: number, right: number) {
  return Math.abs(((left - right + 180) % 360) - 180);
}

function daysUntil(periodEnd: string, date: string) {
  const end = new Date(`${periodEnd.slice(0, 10)}T00:00:00Z`);
  const current = new Date(`${date}T00:00:00Z`);
  return Math.round((end.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));
}

function relevantPlanetList(snapshot: ChartSnapshot, bundle: TimingTopicBundle, topic: LifeAreaTimingTopic) {
  const planets = Object.keys(bundle.planets) as Planet[];
  const houseLords = timingBlueprints[topic].housesUsed.map((house) => lordOfHouse(snapshot, house));
  return unique([...planets, ...houseLords]);
}

function scorePhase(input: Pick<LifeAreaTimingPoint, "support" | "pressure" | "volatility" | "confidence">): LifeAreaTimingPoint["phase"] {
  if (input.confidence < 45) {
    return "low_confidence";
  }
  if (input.volatility >= 66 && input.volatility > input.support) {
    return "volatile";
  }
  if (input.support - input.pressure >= 16) {
    return "supported";
  }
  if (input.pressure - input.support >= 14) {
    return "pressured";
  }
  return "mixed";
}

function factorWithoutImpact(factor: InternalTimingFactor): LifeAreaTimingFactor {
  return {
    source: factor.source,
    score_kind: factor.score_kind,
    label: factor.label,
    summary: factor.summary,
    citations: factor.citations,
    impact: round(factor.impact),
  };
}

function topFactors(factors: InternalTimingFactor[]) {
  const seen = new Set<string>();
  return factors
    .slice()
    .sort((left, right) => right.impact - left.impact)
    .filter((factor) => {
      const key = `${factor.source}:${factor.label}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 6)
    .map(factorWithoutImpact);
}

export function scoreLifeAreaTimingPoint(input: ScoreLifeAreaTimingInput): LifeAreaTimingPoint {
  const blueprint = timingBlueprints[input.topic];
  const relevantHouses = unique(Object.keys(input.bundle.houses).map(Number));
  const relevantPlanets = relevantPlanetList(input.snapshot, input.bundle, input.topic);
  const topicCopy = topicTimingCopy[input.topic];
  const topicTitle = lifeAreaTimingTopicTitles[input.topic];
  const factors: InternalTimingFactor[] = [];
  let support = 36;
  let pressure = 16;
  let volatility = 12;
  let vargaSignalCount = 0;

  for (const house of relevantHouses) {
    const entry = input.bundle.houses[house];
    if (!entry) {
      continue;
    }
    if (entry.strength === "high") {
      support += 8;
      addFactor(factors, {
        source: "natal",
        score_kind: "support",
        impact: 8,
        label: `${ordinal(house)} house supports ${topicCopy.noun}`,
        summary: entry.summary,
        citations: citations({ charts: ["D1", "Bhava"], houses: [house], planets: [lordOfHouse(input.snapshot, house)] }),
      });
    } else if (entry.strength === "low") {
      pressure += 10;
      volatility += difficultHouses.has(house) ? 3 : 1;
      addFactor(factors, {
        source: "natal",
        score_kind: "pressure",
        impact: 10,
        label: `${ordinal(house)} house pressures ${topicCopy.noun}`,
        summary: entry.summary,
        citations: citations({ charts: ["D1", "Bhava"], houses: [house], planets: [lordOfHouse(input.snapshot, house)] }),
      });
    } else {
      support += 2;
      pressure += 2;
    }
  }

  for (const planet of relevantPlanets) {
    const placement = natalPlacement(input.snapshot, planet);
    if (!placement) {
      continue;
    }
    if (strongDignities.has(placement.dignity) && !placement.combust) {
      support += 4;
      addFactor(factors, {
        source: "natal",
        score_kind: "support",
        impact: 4,
        label: `${planet} has usable natal strength`,
        summary: `${planet} supports ${topicCopy.action} from ${placement.sign} in the ${ordinal(placement.house)} house.`,
        citations: citations({ charts: ["D1"], houses: [placement.house], planets: [planet] }),
      });
    }
    if (weakDignities.has(placement.dignity) || placement.combust || difficultHouses.has(placement.house)) {
      const delta = weakDignities.has(placement.dignity) ? 6 : 3;
      pressure += delta;
      volatility += placement.retrograde ? 2 : 0;
      addFactor(factors, {
        source: "natal",
        score_kind: "pressure",
        impact: delta,
        label: `${planet} needs correction`,
        summary: `${planet} adds ${topicCopy.caution} because it is ${placement.dignity}${placement.combust ? ", combust" : ""} in house ${placement.house}.`,
        citations: citations({ charts: ["D1"], houses: [placement.house], planets: [planet] }),
      });
    }
  }

  for (const chartKey of blueprint.chartsUsed.filter((chart) => !["D1", "Bhava", "Moon"].includes(chart))) {
    const chart = input.snapshot.charts[chartKey];
    if (!chart) {
      continue;
    }
    for (const planet of relevantPlanets) {
      const placement = chart.planets.find((entry) => entry.planet === planet);
      if (!placement) {
        continue;
      }
      if (relevantHouses.includes(placement.house)) {
        support += 3;
        vargaSignalCount += 1;
        addFactor(factors, {
          source: "varga",
          score_kind: "support",
          impact: 3,
          label: `${chartKey} confirms ${planet}`,
          summary: `${planet} falls in the ${ordinal(placement.house)} house in ${chartKey}, reinforcing ${topicCopy.noun}.`,
          citations: citations({ charts: [chartKey], houses: [placement.house], planets: [planet] }),
        });
      } else if (difficultHouses.has(placement.house)) {
        pressure += 2;
        vargaSignalCount += 1;
        addFactor(factors, {
          source: "varga",
          score_kind: "pressure",
          impact: 2,
          label: `${chartKey} adds ${planet} pressure`,
          summary: `${planet} falls in the ${ordinal(placement.house)} house in ${chartKey}, so ${topicCopy.noun} needs more care.`,
          citations: citations({ charts: [chartKey], houses: [placement.house], planets: [planet] }),
        });
      }
    }
  }

  const dashaPeriods = [
    input.dashaTiming.active_mahadasha,
    input.dashaTiming.active_antardasha,
    input.dashaTiming.active_pratyantardasha,
  ].filter((period): period is DashaTimeline["periods"][number] => Boolean(period));

  for (const period of dashaPeriods) {
    const placement = natalPlacement(input.snapshot, period.lord);
    const ownedHouses = housesOwnedBy(input.snapshot, period.lord);
    const directlyRelevant =
      relevantPlanets.includes(period.lord) ||
      ownedHouses.some((house) => relevantHouses.includes(house)) ||
      (placement ? relevantHouses.includes(placement.house) : false);
    const weight = period.level === "mahadasha" ? 8 : period.level === "antardasha" ? 7 : 4;
    if (directlyRelevant && placement) {
      if (strongDignities.has(placement.dignity) && !placement.combust) {
        support += weight;
        addFactor(factors, {
          source: "dasha",
          score_kind: "support",
          impact: weight,
          label: `${period.lord} ${period.level} activates ${topicCopy.noun}`,
          summary: `${period.lord} is active by dasha and connects to ${topicCopy.action}.`,
          citations: citations({ charts: ["D1"], houses: unique([...ownedHouses, placement.house]), planets: [period.lord] }),
        });
      } else {
        const dashaPressure = weakDignities.has(placement.dignity) || difficultHouses.has(placement.house) ? weight : Math.round(weight * 0.45);
        pressure += dashaPressure;
        addFactor(factors, {
          source: "dasha",
          score_kind: "pressure",
          impact: dashaPressure,
          label: `${period.lord} ${period.level} asks for correction`,
          summary: `${period.lord} is active by dasha, but its natal condition makes ${topicCopy.noun} more conditional.`,
          citations: citations({ charts: ["D1"], houses: unique([...ownedHouses, placement.house]), planets: [period.lord] }),
        });
      }
    }

    const daysToShift = daysUntil(period.end, input.date);
    if (daysToShift >= 0 && daysToShift <= 30) {
      volatility += 8;
      addFactor(factors, {
        source: "dasha",
        score_kind: "volatility",
        impact: 8,
        label: `${period.level} changes soon`,
        summary: `${period.lord} ${period.level} ends within ${daysToShift} day(s), so timing should be read as transitional.`,
        citations: citations({ charts: ["D1"], houses: relevantHouses, planets: [period.lord] }),
      });
    }
  }

  for (const hit of input.transits.overlay?.hits ?? []) {
    if (hit.kind === "minor" || typeof hit.house !== "number" || !relevantHouses.includes(hit.house)) {
      continue;
    }
    const scaledDelta = (hit.score_delta ?? 0) * 0.55;
    const impact = Math.abs(scaledDelta);
    if (scaledDelta > 0) {
      support += scaledDelta;
      addFactor(factors, {
        source: "transit",
        score_kind: "support",
        impact,
        label: hit.rule,
        summary: hit.note,
        citations: citations({ charts: ["Transit"], houses: [hit.house], planets: [hit.planet] }),
      });
    } else if (scaledDelta < 0) {
      pressure += impact;
      volatility += hit.severity === "high" ? 3 : 1.5;
      addFactor(factors, {
        source: "transit",
        score_kind: hit.severity === "high" ? "pressure" : "volatility",
        impact,
        label: hit.rule,
        summary: hit.note,
        citations: citations({ charts: ["Transit"], houses: [hit.house], planets: [hit.planet] }),
      });
    }
  }

  for (const transit of input.transits.positions) {
    const directHouseHit = relevantHouses.includes(transit.house);
    const aspectedHouse = relevantHouses.find((house) => aspectHousesFrom(transit.house, transit.planet).includes(house));
    const hasTopicContact = directHouseHit || typeof aspectedHouse === "number";
    const contactHouse = directHouseHit ? transit.house : aspectedHouse;
    const contactWeight = directHouseHit ? 1 : 0.45;

    if (hasTopicContact && contactHouse) {
      if (transit.planet === "Jupiter") {
        const delta = 9 * contactWeight;
        support += delta;
        addFactor(factors, {
          source: "transit",
          score_kind: "support",
          impact: delta,
          label: `Jupiter activates house ${contactHouse}`,
          summary: `Jupiter supports ${topicCopy.action} through house ${contactHouse}.`,
          citations: citations({ charts: ["Transit"], houses: [contactHouse], planets: ["Jupiter"] }),
        });
      } else if (input.topic === "emotional" && transit.planet === "Moon" && difficultHouses.has(contactHouse)) {
        const delta = 5 * contactWeight;
        pressure += delta;
        volatility += delta;
        addFactor(factors, {
          source: "transit",
          score_kind: "volatility",
          impact: delta,
          label: `Moon stirs house ${contactHouse}`,
          summary: `Moon moving through house ${contactHouse} can make the felt sense more private, reactive, or unsettled.`,
          citations: citations({ charts: ["Transit"], houses: [contactHouse], planets: ["Moon"] }),
        });
      } else if (transit.planet === "Venus" || transit.planet === "Mercury" || transit.planet === "Moon") {
        const delta = (transit.planet === "Moon" ? 3 : 5) * contactWeight;
        support += delta;
        addFactor(factors, {
          source: "transit",
          score_kind: "support",
          impact: delta,
          label: `${transit.planet} activates house ${contactHouse}`,
          summary: `${transit.planet} gives short-term support for ${topicCopy.action}.`,
          citations: citations({ charts: ["Transit"], houses: [contactHouse], planets: [transit.planet] }),
        });
      } else if (transit.planet === "Mars" && upachayaHouses.has(contactHouse) && input.topic === "career") {
        support += 4 * contactWeight;
        volatility += 4 * contactWeight;
        addFactor(factors, {
          source: "transit",
          score_kind: "support",
          impact: 4 * contactWeight,
          label: `Mars drives career execution`,
          summary: `Mars can support competitive career action through house ${contactHouse}, but the signal is not calm.`,
          citations: citations({ charts: ["Transit"], houses: [contactHouse], planets: ["Mars"] }),
        });
      } else if (hardMalefics.has(transit.planet)) {
        const delta = (transit.planet === "Saturn" ? 8 : transit.planet === "Mars" ? 6 : 9) * contactWeight;
        pressure += delta;
        volatility += (transit.planet === "Saturn" ? 4 : 7) * contactWeight;
        addFactor(factors, {
          source: "transit",
          score_kind: transit.planet === "Saturn" ? "pressure" : "volatility",
          impact: delta,
          label: `${transit.planet} pressures house ${contactHouse}`,
          summary: `${transit.planet} raises ${topicCopy.caution} through house ${contactHouse}.`,
          citations: citations({ charts: ["Transit"], houses: [contactHouse], planets: [transit.planet] }),
        });
      } else {
        support += 2 * contactWeight;
        pressure += 1 * contactWeight;
      }
    }

    for (const natalPlanet of relevantPlanets) {
      const natal = natalPlacement(input.snapshot, natalPlanet);
      if (!natal || circularDiff(transit.longitude_deg, natal.longitude_deg) > 3) {
        continue;
      }
      if (transit.planet === "Jupiter") {
        support += 8;
        addFactor(factors, {
          source: "transit",
          score_kind: "support",
          impact: 8,
          label: `Jupiter contacts natal ${natalPlanet}`,
          summary: `Jupiter is within 3 degrees of natal ${natalPlanet}, strengthening ${topicCopy.action}.`,
          citations: citations({ charts: ["Transit", "D1"], houses: [natal.house], planets: ["Jupiter", natalPlanet] }),
        });
      } else if (hardMalefics.has(transit.planet)) {
        const delta = transit.planet === "Saturn" ? 9 : transit.planet === "Mars" ? 6 : 10;
        pressure += delta;
        volatility += transit.planet === "Saturn" ? 4 : 7;
        addFactor(factors, {
          source: "transit",
          score_kind: "pressure",
          impact: delta,
          label: `${transit.planet} contacts natal ${natalPlanet}`,
          summary: `${transit.planet} is within 3 degrees of natal ${natalPlanet}, increasing ${topicCopy.caution}.`,
          citations: citations({ charts: ["Transit", "D1"], houses: [natal.house], planets: [transit.planet, natalPlanet] }),
        });
      } else if (benefics.has(transit.planet)) {
        support += 4;
        addFactor(factors, {
          source: "transit",
          score_kind: "support",
          impact: 4,
          label: `${transit.planet} contacts natal ${natalPlanet}`,
          summary: `${transit.planet} gives a short-term support contact to natal ${natalPlanet}.`,
          citations: citations({ charts: ["Transit", "D1"], houses: [natal.house], planets: [transit.planet, natalPlanet] }),
        });
      }
    }
  }

  let confidence = input.birthTimeConfidence === "exact" ? 86 : input.birthTimeConfidence === "approximate" ? 72 : 48;
  if (input.transits.positions.length === 0) {
    confidence -= 12;
    addFactor(factors, {
      source: "confidence",
      score_kind: "confidence",
      impact: 12,
      label: "Transit layer missing",
      summary: "No transit positions are available, so the point relies mostly on natal and dasha context.",
      citations: citations({ charts: ["D1"], houses: relevantHouses, planets: relevantPlanets.slice(0, 4) }),
    });
  }
  if (vargaSignalCount === 0 && blueprint.chartsUsed.some((chart) => !["D1", "Bhava", "Moon"].includes(chart))) {
    confidence -= 5;
  }
  if (support > 70 && pressure > 55) {
    confidence -= 8;
  }
  if (input.birthTimeConfidence !== "exact") {
    addFactor(factors, {
      source: "confidence",
      score_kind: "confidence",
      impact: input.birthTimeConfidence === "unknown" ? 16 : 8,
      label: "Birth time limits precision",
      summary: `Birth time confidence is ${input.birthTimeConfidence}, so house-based ${topicTitle.toLowerCase()} timing should be treated as directional.`,
      citations: citations({ charts: ["D1"], houses: relevantHouses, planets: relevantPlanets.slice(0, 4) }),
    });
  }

  if (input.birthTimeConfidence !== "exact") {
    const scale = input.birthTimeConfidence === "approximate" ? 0.72 : 0.42;
    const volatilityScale = input.birthTimeConfidence === "approximate" ? 0.82 : 0.58;
    support = 36 + (support - 36) * scale;
    pressure = 16 + (pressure - 16) * scale;
    volatility = 12 + (volatility - 12) * volatilityScale;
    support = Math.min(support, input.birthTimeConfidence === "approximate" ? 78 : 58);
    pressure = Math.min(pressure, input.birthTimeConfidence === "approximate" ? 82 : 70);
  }

  const rounded = {
    support: round(clamp(support, 0, 100)),
    pressure: round(clamp(pressure, 0, 100)),
    volatility: round(clamp(volatility, 0, 100)),
    confidence: round(clamp(confidence, 0, 100)),
  };

  return LifeAreaTimingPointSchema.parse({
    date: input.date,
    granularity: "daily",
    ...rounded,
    phase: scorePhase(rounded),
    top_factors: topFactors(factors),
  });
}

export function aggregateMonthlyTimingPoint(points: LifeAreaTimingPoint[]): LifeAreaTimingPoint {
  if (points.length === 0) {
    throw new Error("Cannot aggregate an empty month.");
  }

  const factorCounts = new Map<string, { factor: LifeAreaTimingFactor; count: number; totalImpact: number }>();
  for (const point of points) {
    for (const factor of point.top_factors) {
      const key = `${factor.source}:${factor.label}`;
      const current = factorCounts.get(key);
      const impact = factor.impact ?? 1;
      factorCounts.set(
        key,
        current
          ? { factor: current.factor, count: current.count + 1, totalImpact: current.totalImpact + impact }
          : { factor, count: 1, totalImpact: impact },
      );
    }
  }
  const averageVolatility = average(points.map((point) => point.volatility));
  const maxVolatility = Math.max(...points.map((point) => point.volatility));

  const rounded = {
    support: round(average(points.map((point) => point.support))),
    pressure: round(average(points.map((point) => point.pressure))),
    volatility: round(averageVolatility * 0.65 + maxVolatility * 0.35),
    confidence: round(average(points.map((point) => point.confidence))),
  };

  return LifeAreaTimingPointSchema.parse({
    date: `${points[0]?.date.slice(0, 7)}-01`,
    granularity: "monthly",
    ...rounded,
    phase: scorePhase(rounded),
    top_factors: [...factorCounts.values()]
      .sort((left, right) => right.totalImpact - left.totalImpact || right.count - left.count)
      .slice(0, 6)
      .map((entry) => ({ ...entry.factor, impact: round(entry.totalImpact) })),
  });
}

export function buildLifeAreaTimingSeries(input: {
  topic: LifeAreaTimingTopic;
  year: number;
  timezone: string;
  monthly: LifeAreaTimingPoint[];
  daily?: LifeAreaTimingPoint[];
  engineVersion?: string;
  derivedSchemaVersion?: string;
}): LifeAreaTimingSeries {
  return LifeAreaTimingSeriesSchema.parse({
    version: "life_area_timing_v1",
    scoring_version: LIFE_AREA_TIMING_SCORING_VERSION,
    engine_version: input.engineVersion,
    derived_schema_version: input.derivedSchemaVersion,
    topic: input.topic,
    year: input.year,
    timezone: input.timezone,
    monthly: input.monthly,
    daily: input.daily,
    generated_at: new Date().toISOString(),
  });
}
