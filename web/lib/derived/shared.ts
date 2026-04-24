import type { ChartSnapshot, Planet, Topic } from "@/lib/schemas";

type StaticPlanetRule = {
  label: string;
  planet: Planet;
};

type DynamicPlanetRule = {
  label: string;
  resolve(snapshot: ChartSnapshot): Planet;
};

export type TopicPlanetRule = StaticPlanetRule | DynamicPlanetRule;

export type TopicBlueprint = {
  topic: Topic;
  chartsUsed: string[];
  housesUsed: number[];
  planetRules: TopicPlanetRule[];
};

export const topicTitles: Record<Topic, string> = {
  personality: "Personality",
  career: "Career",
  wealth: "Wealth",
  relationships: "Relationships",
  marriage: "Marriage",
  family: "Family",
  health: "Health",
  education: "Education",
  spirituality: "Spirituality",
  relocation: "Relocation",
};

export function defineTopic(topic: TopicBlueprint) {
  return topic;
}

export function namedPlanet(planet: Planet, label: string): TopicPlanetRule {
  return { planet, label };
}

export function houseLordRule(house: number, label = `${ordinal(house)} lord`): TopicPlanetRule {
  return {
    label,
    resolve(snapshot) {
      return lordOfHouse(snapshot, house);
    },
  };
}

export function lagnaLordRule(label = "Lagna lord"): TopicPlanetRule {
  return {
    label,
    resolve(snapshot) {
      return lordOfHouse(snapshot, 1);
    },
  };
}

export function lordOfHouse(snapshot: ChartSnapshot, house: number): Planet {
  const d1 = snapshot.charts.D1;
  if (!d1) {
    throw new Error("ChartSnapshot is missing D1, which phase 05 requires.");
  }

  const placement = d1.houses.find((entry) => entry.house === house);
  if (!placement) {
    throw new Error(`D1 is missing house ${house}.`);
  }

  return placement.lord;
}

export function ordinal(value: number) {
  if (value % 100 >= 11 && value % 100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}
