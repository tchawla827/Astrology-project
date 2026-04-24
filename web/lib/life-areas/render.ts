import { topicTitles } from "@/lib/derived/shared";
import type { ChartSnapshot, Planet, Topic, TopicBundle } from "@/lib/schemas";

export const mvpLifeAreaTopics = ["personality", "career", "wealth", "relationships"] as const;

export type MvpLifeAreaTopic = (typeof mvpLifeAreaTopics)[number];

export type LifeAreaViewModel = {
  topic: Topic;
  title: string;
  confidence: {
    level: "high" | "medium" | "low";
    note: string;
  };
  headline_signals: string[];
  houses: Array<{
    number: number;
    sign: string;
    strength: "high" | "medium" | "low";
    summary: string;
  }>;
  planets: Array<{
    name: Planet;
    role: string;
    summary: string;
  }>;
  timing: {
    mahadasha: string;
    antardasha: string;
    notes: string[];
  };
};

function isSupportedLifeAreaTopic(topic: string): topic is MvpLifeAreaTopic {
  return mvpLifeAreaTopics.includes(topic as MvpLifeAreaTopic);
}

function resolveConfidenceLevel(
  bundle: TopicBundle,
  birthTimeConfidence: ChartSnapshot["birth_time_confidence"] | "exact" | "approximate" | "unknown",
): LifeAreaViewModel["confidence"]["level"] {
  const strengths = Object.values(bundle.houses).map((house) => house.strength);
  const highCount = strengths.filter((strength) => strength === "high").length;
  const lowCount = strengths.filter((strength) => strength === "low").length;

  if (birthTimeConfidence === "unknown") {
    return "low";
  }

  if (birthTimeConfidence === "approximate" && lowCount > 0 && highCount === 0) {
    return "low";
  }

  if (birthTimeConfidence === "exact" && highCount > 0 && lowCount === 0) {
    return "high";
  }

  return "medium";
}

function parseDashaLabel(value: string) {
  const [label] = value.split(" (");
  return label ?? value;
}

export function renderLifeArea(
  topic: Topic,
  bundle: TopicBundle,
  snapshot: ChartSnapshot,
  birthTimeConfidence: "exact" | "approximate" | "unknown",
): LifeAreaViewModel {
  const d1 = snapshot.charts.D1;
  if (!d1) {
    throw new Error("ChartSnapshot is missing D1, which life-area rendering requires.");
  }

  return {
    topic,
    title: topicTitles[topic],
    confidence: {
      level: resolveConfidenceLevel(bundle, birthTimeConfidence),
      note: bundle.confidence_note,
    },
    headline_signals: bundle.headline_signals,
    houses: Object.entries(bundle.houses)
      .map(([houseNumber, house]) => {
        const number = Number(houseNumber);
        const housePlacement = d1.houses.find((entry) => entry.house === number);
        if (!housePlacement) {
          throw new Error(`D1 is missing house ${number}.`);
        }

        return {
          number,
          sign: housePlacement.sign,
          strength: house.strength,
          summary: house.summary,
        };
      })
      .sort((left, right) => left.number - right.number),
    planets: Object.entries(bundle.planets).map(([name, planet]) => ({
      name: name as Planet,
      role: planet.role,
      summary: planet.summary,
    })),
    timing: {
      mahadasha: parseDashaLabel(bundle.timing.current_mahadasha),
      antardasha: parseDashaLabel(bundle.timing.current_antardasha),
      notes: bundle.timing.current_trigger_notes,
    },
  };
}

export { isSupportedLifeAreaTopic };
