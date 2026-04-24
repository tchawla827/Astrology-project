import {
  DerivedFeaturePayloadSchema,
  TopicBundleSchema,
  type Chart,
  type ChartSnapshot,
  type DerivedFeaturePayload,
  type Planet,
  type PlanetPlacement,
  type Topic,
  type TopicBundle,
  type TopicBundleCollection,
} from "@/lib/schemas";
import { buildDerivedDashboardSummary } from "@/lib/derived/dashboardSummary";
import { ordinal, topicTitles, type TopicBlueprint } from "@/lib/derived/shared";
import { computeTimeSensitivity } from "@/lib/derived/timeSensitivity";
import { topicBlueprints, topicOrder } from "@/lib/derived/topics";

export const DERIVED_SCHEMA_VERSION = "derived_v1";

type ComputeBundlesOptions = {
  onboardingIntent?: string | null;
};

const beneficPlanets = new Set<Planet>(["Jupiter", "Venus", "Mercury", "Moon"]);
const maleficPlanets = new Set<Planet>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
const supportiveDignities = new Set<PlanetPlacement["dignity"]>(["own", "exalted"]);
const weakDignities = new Set<PlanetPlacement["dignity"]>(["enemy", "debilitated"]);
const difficultHouses = new Set([6, 8, 12]);

function requireChart(snapshot: ChartSnapshot, chartKey: string): Chart {
  const chart = snapshot.charts[chartKey];
  if (!chart) {
    throw new Error(`ChartSnapshot is missing ${chartKey}, which phase 05 requires.`);
  }
  return chart;
}

function getD1House(snapshot: ChartSnapshot, house: number) {
  const d1 = requireChart(snapshot, "D1");
  const placement = d1.houses.find((entry) => entry.house === house);
  if (!placement) {
    throw new Error(`D1 is missing house ${house}.`);
  }
  return placement;
}

function getD1Occupants(snapshot: ChartSnapshot, house: number): Planet[] {
  return requireChart(snapshot, "D1").planets.filter((entry) => entry.house === house).map((entry) => entry.planet);
}

function getPlanetPlacement(snapshot: ChartSnapshot, planet: Planet) {
  const placement = snapshot.planetary_positions.find((entry) => entry.planet === planet);
  if (!placement) {
    throw new Error(`Snapshot is missing a D1 placement for ${planet}.`);
  }
  return placement;
}

function getPlanetPlacementInChart(snapshot: ChartSnapshot, chartKey: string, planet: Planet) {
  return snapshot.charts[chartKey]?.planets.find((entry) => entry.planet === planet);
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

function summarizeModifiers(placement: PlanetPlacement) {
  const modifiers: string[] = [];
  if (placement.retrograde) {
    modifiers.push("retrograde");
  }
  if (placement.combust) {
    modifiers.push("combust");
  }
  return modifiers;
}

function dignityText(dignity: PlanetPlacement["dignity"]) {
  switch (dignity) {
    case "exalted":
      return "strongly exalted";
    case "own":
      return "steady in its own sign";
    case "friendly":
      return "supported by a friendly sign";
    case "neutral":
      return "working from neutral ground";
    case "enemy":
      return "working in an enemy sign";
    case "debilitated":
      return "debilitated";
  }
}

function supportFromAuxiliaryCharts(snapshot: ChartSnapshot, chartsUsed: string[], planet: Planet) {
  for (const chartKey of chartsUsed) {
    if (chartKey === "D1" || chartKey === "Bhava" || chartKey === "Moon") {
      continue;
    }

    const placement = getPlanetPlacementInChart(snapshot, chartKey, planet);
    if (placement) {
      return `${chartKey} echoes this through ${placement.sign} in the ${ordinal(placement.house)}.`;
    }
  }

  return "";
}

function hasMaleficAspect(snapshot: ChartSnapshot, house: number, occupants: Planet[]) {
  return snapshot.aspects.some((aspect) => {
    if (!maleficPlanets.has(aspect.from)) {
      return false;
    }

    if (typeof aspect.to === "number") {
      return aspect.to === house;
    }

    return occupants.includes(aspect.to);
  });
}

function resolveStrength(snapshot: ChartSnapshot, house: number) {
  const housePlacement = getD1House(snapshot, house);
  const lordPlacement = getPlanetPlacement(snapshot, housePlacement.lord);
  const occupants = getD1Occupants(snapshot, house);

  const hasBeneficOccupant = occupants.some((planet) => beneficPlanets.has(planet));
  const hasMaleficOccupant = occupants.some((planet) => maleficPlanets.has(planet));
  const hasHardAspect = hasMaleficAspect(snapshot, house, occupants);
  const lordStrong = supportiveDignities.has(lordPlacement.dignity);
  const lordWeak = weakDignities.has(lordPlacement.dignity) || difficultHouses.has(lordPlacement.house);

  if ((hasBeneficOccupant || lordStrong) && !hasHardAspect && !lordWeak) {
    return "high" as const;
  }

  if ((hasMaleficOccupant || hasHardAspect) && lordWeak) {
    return "low" as const;
  }

  return "medium" as const;
}

function buildHouseSummary(snapshot: ChartSnapshot, house: number, strength: "low" | "medium" | "high") {
  const housePlacement = getD1House(snapshot, house);
  const lordPlacement = getPlanetPlacement(snapshot, housePlacement.lord);
  const occupants = getD1Occupants(snapshot, house);
  const occupantText =
    occupants.length > 0 ? `occupied by ${formatList(occupants)}` : "without direct planetary occupation";
  const strengthText =
    strength === "high"
      ? "the structure is supportive"
      : strength === "low"
        ? "the structure is under strain"
        : "the structure is mixed";

  return `${ordinal(house)} house in ${housePlacement.sign}, ruled by ${housePlacement.lord} placed in the ${ordinal(lordPlacement.house)} in ${lordPlacement.sign}, ${occupantText}; ${strengthText}.`;
}

function resolvePlanetRules(snapshot: ChartSnapshot, blueprint: TopicBlueprint) {
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

function buildPlanetSummary(
  snapshot: ChartSnapshot,
  chartsUsed: string[],
  planet: Planet,
  roleLabels: string[],
) {
  const placement = getPlanetPlacement(snapshot, planet);
  const modifiers = summarizeModifiers(placement);
  const modifierText = modifiers.length > 0 ? `, ${formatList(modifiers)}` : "";
  const auxiliarySupport = supportFromAuxiliaryCharts(snapshot, chartsUsed, planet);
  const roleText = roleLabels.length > 0 ? roleLabels.join(" / ") : planet;

  return `${roleText} ${planet} is in ${placement.sign} in the ${ordinal(placement.house)} with ${dignityText(placement.dignity)}${modifierText}. ${auxiliarySupport}`.trim();
}

function matchesTopicHighlight(note: string, housesUsed: number[], planetsUsed: Planet[]) {
  const mentionsHouse = housesUsed.some((house) => new RegExp(`\\b${house}(?:st|nd|rd|th)?\\s+house\\b`, "i").test(note));
  const mentionsPlanet = planetsUsed.some((planet) => new RegExp(`\\b${planet}\\b`, "i").test(note));
  return mentionsHouse || mentionsPlanet;
}

function buildHeadlineSignals(
  snapshot: ChartSnapshot,
  topic: Topic,
  houses: TopicBundle["houses"],
  planets: TopicBundle["planets"],
  triggerNotes: string[],
) {
  const houseEntries = Object.entries(houses)
    .map(([key, value]) => ({ house: Number(key), ...value }))
    .sort((left, right) => {
      const score = { high: 2, medium: 1, low: 0 };
      return score[right.strength] - score[left.strength];
    });
  const planetNames = Object.keys(planets) as Planet[];
  const currentLords = [snapshot.dasha.current_mahadasha.lord, snapshot.dasha.current_antardasha.lord];
  const dashaHits = currentLords.filter((lord) => planetNames.includes(lord));

  const signals: string[] = [];
  const strongestHouse = houseEntries.find((entry) => entry.strength === "high") ?? houseEntries[0];
  const stressedHouse = houseEntries.find((entry) => entry.strength === "low");

  if (strongestHouse) {
    signals.push(`${topicTitles[topic]} is supported through the ${ordinal(strongestHouse.house)} house.`);
  }

  if (stressedHouse) {
    signals.push(`${ordinal(stressedHouse.house)}-house pressure is the main drag on ${topic}.`);
  }

  if (dashaHits.length > 0) {
    signals.push(`${formatList(dashaHits)} are directly timing ${topic} right now.`);
  } else if (planetNames[0]) {
    const leadPlanet = getPlanetPlacement(snapshot, planetNames[0]);
    signals.push(`${planetNames[0]} carries ${topic} through the ${ordinal(leadPlanet.house)} house.`);
  }

  if (triggerNotes[0]) {
    signals.push(triggerNotes[0]);
  }

  return signals.filter((value, index, values) => values.indexOf(value) === index).slice(0, 3);
}

function buildConfidenceNote(snapshot: ChartSnapshot, houses: TopicBundle["houses"]) {
  const strengths = Object.values(houses).map((entry) => entry.strength);
  const highCount = strengths.filter((value) => value === "high").length;
  const lowCount = strengths.filter((value) => value === "low").length;
  const internalRead =
    highCount > 0 && lowCount > 0
      ? "Signals are mixed inside this bundle."
      : highCount > 0
        ? "Signals are internally consistent and mostly supportive."
        : lowCount > 0
          ? "Signals cluster around delay, stress, or cleanup."
          : "Signals are moderate rather than decisive.";
  const birthTimeConfidence = snapshot.birth_time_confidence ?? "unknown";
  const birthTimeRead =
    birthTimeConfidence === "exact"
      ? "Birth time is exact, so house weighting is relatively reliable."
      : birthTimeConfidence === "approximate"
        ? "Birth time is approximate, so house emphasis can shift somewhat."
        : "Birth time is unknown, so lagna-dependent detail stays lower confidence.";

  return `${internalRead} ${birthTimeRead}`;
}

function buildTopicBundle(snapshot: ChartSnapshot, blueprint: TopicBlueprint): TopicBundle {
  const houses = blueprint.housesUsed.reduce<TopicBundle["houses"]>((result, house) => {
    const strength = resolveStrength(snapshot, house);
    result[house] = {
      summary: buildHouseSummary(snapshot, house, strength),
      strength,
    };
    return result;
  }, {});

  const resolvedRoles = resolvePlanetRules(snapshot, blueprint);
  const planets = Array.from(resolvedRoles.entries()).reduce<TopicBundle["planets"]>((result, [planet, roleLabels]) => {
    result[planet] = {
      role: roleLabels.join(" / "),
      summary: buildPlanetSummary(snapshot, blueprint.chartsUsed, planet, roleLabels),
    };
    return result;
  }, {});

  const planetKeys = Object.keys(planets) as Planet[];
  const currentTriggerNotes = snapshot.transits.highlights.filter((note) =>
    matchesTopicHighlight(note, blueprint.housesUsed, planetKeys),
  );

  return TopicBundleSchema.parse({
    topic: blueprint.topic,
    charts_used: blueprint.chartsUsed,
    headline_signals: buildHeadlineSignals(snapshot, blueprint.topic, houses, planets, currentTriggerNotes),
    houses,
    planets,
    timing: {
      current_mahadasha: `${snapshot.dasha.current_mahadasha.lord} (${snapshot.dasha.current_mahadasha.start} -> ${snapshot.dasha.current_mahadasha.end})`,
      current_antardasha: `${snapshot.dasha.current_antardasha.lord} (${snapshot.dasha.current_antardasha.start} -> ${snapshot.dasha.current_antardasha.end})`,
      current_trigger_notes: currentTriggerNotes,
    },
    confidence_note: buildConfidenceNote(snapshot, houses),
  });
}

export function computeBundles(snapshot: ChartSnapshot, options: ComputeBundlesOptions = {}): DerivedFeaturePayload {
  const topicBundles = topicOrder.reduce<TopicBundleCollection>((result, topic) => {
    result[topic] = buildTopicBundle(snapshot, topicBlueprints[topic]);
    return result;
  }, {} as TopicBundleCollection);

  return DerivedFeaturePayloadSchema.parse({
    topic_bundles: topicBundles,
    dashboard_summary: buildDerivedDashboardSummary(snapshot, topicBundles, options.onboardingIntent),
    time_sensitivity: computeTimeSensitivity(topicBundles, snapshot),
  });
}
