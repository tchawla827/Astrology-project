import { defineTopic, lagnaLordRule, namedPlanet } from "@/lib/derived/shared";

export const personalityTopic = defineTopic({
  topic: "personality",
  chartsUsed: ["D1", "Bhava", "Moon"],
  housesUsed: [1],
  planetRules: [lagnaLordRule(), namedPlanet("Moon", "Emotional signature"), namedPlanet("Sun", "Core identity")],
});
