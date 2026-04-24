import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const spiritualityTopic = defineTopic({
  topic: "spirituality",
  chartsUsed: ["D1", "D20", "D45", "D60"],
  housesUsed: [5, 9, 12],
  planetRules: [
    namedPlanet("Ketu", "Detachment axis"),
    namedPlanet("Jupiter", "Faith and guidance"),
    houseLordRule(9, "9th lord"),
    houseLordRule(12, "12th lord"),
  ],
});
