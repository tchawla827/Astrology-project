import {
  DashboardSummarySchema,
  type ChartSnapshot,
  type DashboardSummary,
  type FocusCard,
  type Planet,
  type Topic,
  type TopicBundle,
  type TopicBundleCollection,
} from "@/lib/schemas";
import { topicTitles } from "@/lib/derived/shared";

const intentToTopic: Record<string, Topic | null> = {
  "know-self": "personality",
  career: "career",
  marriage: "marriage",
  health: "health",
  spirituality: "spirituality",
  "full-chart": null,
};

function topicFromIntent(onboardingIntent?: string | null): Topic | null {
  if (!onboardingIntent) {
    return null;
  }
  return intentToTopic[onboardingIntent] ?? null;
}

function bundlePlanets(bundle: TopicBundle): Planet[] {
  return Object.keys(bundle.planets) as Planet[];
}

function bundleHouses(bundle: TopicBundle): number[] {
  return Object.keys(bundle.houses)
    .map((value) => Number(value))
    .sort((left, right) => left - right);
}

function bundleScore(bundle: TopicBundle) {
  return Object.values(bundle.houses).reduce((score, house) => {
    if (house.strength === "high") {
      return score + 2;
    }
    if (house.strength === "low") {
      return score - 1;
    }
    return score + 0.5;
  }, bundle.headline_signals.length * 0.25);
}

function bundleMatchesDasha(bundle: TopicBundle, snapshot: ChartSnapshot) {
  const planets = new Set(bundlePlanets(bundle));
  return Number(planets.has(snapshot.dasha.current_mahadasha.lord)) + Number(planets.has(snapshot.dasha.current_antardasha.lord));
}

function chooseDashaBundle(topicBundles: TopicBundleCollection, snapshot: ChartSnapshot) {
  return Object.entries(topicBundles)
    .map(([topic, bundle]) => ({ topic: topic as Topic, bundle, matches: bundleMatchesDasha(bundle, snapshot) }))
    .filter((entry) => entry.matches > 0)
    .sort((left, right) => right.matches - left.matches || bundleScore(right.bundle) - bundleScore(left.bundle))[0];
}

function requireTopicSelection<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function chooseStrongestBundle(topicBundles: TopicBundleCollection) {
  return Object.entries(topicBundles)
    .map(([topic, bundle]) => ({ topic: topic as Topic, bundle }))
    .sort((left, right) => bundleScore(right.bundle) - bundleScore(left.bundle))[0];
}

function chooseMostStressedBundle(topicBundles: TopicBundleCollection) {
  return Object.entries(topicBundles)
    .map(([topic, bundle]) => ({
      topic: topic as Topic,
      bundle,
      lowCount: Object.values(bundle.houses).filter((house) => house.strength === "low").length,
    }))
    .sort((left, right) => right.lowCount - left.lowCount || bundleScore(left.bundle) - bundleScore(right.bundle))[0];
}

function buildBundleCard(id: string, topic: Topic, bundle: TopicBundle, title: string, body: string): FocusCard {
  const planets = bundlePlanets(bundle);
  const houses = bundleHouses(bundle);

  return {
    id,
    title,
    body,
    why: {
      charts: bundle.charts_used,
      houses: houses.slice(0, 3),
      planets: planets.slice(0, 3),
    },
  };
}

export function buildDerivedDashboardSummary(
  snapshot: ChartSnapshot,
  topicBundles: TopicBundleCollection,
  onboardingIntent?: string | null,
): DashboardSummary {
  const dashaBundle = chooseDashaBundle(topicBundles, snapshot);
  const strongestBundle = requireTopicSelection(chooseStrongestBundle(topicBundles), "No topic bundles were available.");
  const stressedBundle = requireTopicSelection(chooseMostStressedBundle(topicBundles), "No stressed bundle was available.");
  const intentTopic = topicFromIntent(onboardingIntent);
  const intentBundle = intentTopic ? { topic: intentTopic, bundle: topicBundles[intentTopic] } : strongestBundle;
  const strongestYoga = [...snapshot.yogas].sort((left, right) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[right.confidence] - rank[left.confidence];
  })[0];

  const topThemes = [
    dashaBundle
      ? `${topicTitles[dashaBundle.topic]}: ${dashaBundle.bundle.headline_signals[0] ?? `${snapshot.dasha.current_mahadasha.lord} Mahadasha is defining the tone.`}`
      : `${snapshot.dasha.current_mahadasha.lord} Mahadasha and ${snapshot.dasha.current_antardasha.lord} Antardasha are setting the current pace.`,
    strongestYoga
      ? `${strongestYoga.name}: ${strongestYoga.notes[0] ?? "A repeatable structural pattern is active."}`
      : strongestBundle.bundle.headline_signals[0] ?? `${topicTitles[strongestBundle.topic]} carries the cleanest support.`,
    intentBundle.bundle.headline_signals[0] ?? `${topicTitles[intentBundle.topic]} is worth prioritizing first.`,
  ].filter((value, index, values) => values.indexOf(value) === index);

  const focusCards: FocusCard[] = [];

  if (dashaBundle) {
    focusCards.push(
      buildBundleCard(
        `${dashaBundle.topic}-timing`,
        dashaBundle.topic,
        dashaBundle.bundle,
        `${topicTitles[dashaBundle.topic]} is time-active`,
        dashaBundle.bundle.headline_signals[1] ?? dashaBundle.bundle.headline_signals[0] ?? dashaBundle.bundle.confidence_note,
      ),
    );
  }

  if (!focusCards.some((card) => card.id.startsWith(`${intentBundle.topic}-`))) {
    focusCards.push(
      buildBundleCard(
        `${intentBundle.topic}-focus`,
        intentBundle.topic,
        intentBundle.bundle,
        `${topicTitles[intentBundle.topic]} deserves attention`,
        intentBundle.bundle.headline_signals[0] ?? intentBundle.bundle.confidence_note,
      ),
    );
  }

  if (stressedBundle.lowCount > 0 && !focusCards.some((card) => card.id.startsWith(`${stressedBundle.topic}-`))) {
    focusCards.push(
      buildBundleCard(
        `${stressedBundle.topic}-pressure`,
        stressedBundle.topic,
        stressedBundle.bundle,
        `${topicTitles[stressedBundle.topic]} has the main friction`,
        stressedBundle.bundle.headline_signals[1] ?? stressedBundle.bundle.confidence_note,
      ),
    );
  } else if (strongestYoga) {
    focusCards.push({
      id: "yoga-focus",
      title: strongestYoga.name,
      body: strongestYoga.notes[0] ?? "A natural yoga is reinforcing the current period.",
      why: {
        charts: strongestYoga.source_charts.length > 0 ? strongestYoga.source_charts : ["D1"],
        houses: [],
        planets: strongestYoga.planets_involved.slice(0, 3),
      },
    });
  }

  return DashboardSummarySchema.parse({
    top_themes: topThemes.slice(0, 3),
    focus_cards: focusCards.slice(0, 3),
  });
}
