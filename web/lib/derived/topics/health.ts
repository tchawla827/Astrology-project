import { defineTopic, lagnaLordRule, namedPlanet } from "@/lib/derived/shared";

export const healthTopic = defineTopic({
  topic: "health",
  chartsUsed: ["D1", "D6", "D8", "D30"],
  housesUsed: [1, 6, 8, 12],
  planetRules: [lagnaLordRule(), namedPlanet("Moon", "Recovery pattern"), namedPlanet("Sun", "Vitality marker")],
});
