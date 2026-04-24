import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const relationshipsTopic = defineTopic({
  topic: "relationships",
  chartsUsed: ["D1", "D7", "D9"],
  housesUsed: [5, 7, 11],
  planetRules: [
    houseLordRule(7, "7th lord"),
    namedPlanet("Venus", "Karaka of relating"),
    namedPlanet("Mars", "Passion and conflict marker"),
    namedPlanet("Moon", "Emotional receptivity"),
  ],
});
