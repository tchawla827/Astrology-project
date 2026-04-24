import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const wealthTopic = defineTopic({
  topic: "wealth",
  chartsUsed: ["D1", "D2", "D11"],
  housesUsed: [2, 5, 9, 11],
  planetRules: [
    houseLordRule(2, "2nd lord"),
    houseLordRule(11, "11th lord"),
    namedPlanet("Jupiter", "Karaka of prosperity"),
    namedPlanet("Venus", "Karaka of comfort and liquidity"),
  ],
});
