import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const marriageTopic = defineTopic({
  topic: "marriage",
  chartsUsed: ["D1", "D9"],
  housesUsed: [7],
  planetRules: [
    namedPlanet("Venus", "Marriage significator"),
    namedPlanet("Jupiter", "Commitment stabilizer"),
    houseLordRule(7, "7th lord"),
  ],
});
