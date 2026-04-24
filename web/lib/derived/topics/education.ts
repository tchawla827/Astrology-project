import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const educationTopic = defineTopic({
  topic: "education",
  chartsUsed: ["D1", "D4", "D24"],
  housesUsed: [2, 4, 5, 9],
  planetRules: [
    namedPlanet("Mercury", "Learning style"),
    namedPlanet("Jupiter", "Higher knowledge"),
    houseLordRule(4, "4th lord"),
    houseLordRule(5, "5th lord"),
  ],
});
