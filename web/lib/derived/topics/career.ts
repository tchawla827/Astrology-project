import { defineTopic, houseLordRule, namedPlanet } from "@/lib/derived/shared";

export const careerTopic = defineTopic({
  topic: "career",
  chartsUsed: ["D1", "Bhava", "D10"],
  housesUsed: [2, 6, 10, 11],
  planetRules: [
    houseLordRule(10, "10th lord"),
    namedPlanet("Saturn", "Karaka of sustained work"),
    namedPlanet("Sun", "Karaka of authority"),
    namedPlanet("Mercury", "Karaka of skill and trade"),
    namedPlanet("Jupiter", "Karaka of guidance and growth"),
  ],
});
