import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const relocationTopic = defineTopic({
  topic: "relocation",
  chartsUsed: ["D1", "D4", "D12"],
  housesUsed: [3, 4, 9, 12],
  planetRules: [
    houseLordRule(4, "4th lord"),
    houseLordRule(12, "12th lord"),
    namedPlanet("Rahu", "Displacement and foreign pull"),
  ],
});
