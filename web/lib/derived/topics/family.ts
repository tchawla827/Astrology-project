import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const familyTopic = defineTopic({
  topic: "family",
  chartsUsed: ["D1", "D3", "D4", "D12"],
  housesUsed: [2, 3, 4, 5],
  planetRules: [
    houseLordRule(4, "4th lord"),
    namedPlanet("Moon", "Domestic climate"),
    namedPlanet("Jupiter", "Family guidance"),
  ],
});
