import { TimeSensitivitySchema, type ChartSnapshot, type TimeSensitivity, type TopicBundleCollection } from "@/lib/schemas";
import { lordOfHouse } from "@/lib/derived/shared";

const cardinalHouses = new Set([1, 4, 7, 10]);
const confidenceFactor: Record<NonNullable<ChartSnapshot["birth_time_confidence"]>, number> = {
  exact: 1,
  approximate: 0.65,
  unknown: 0.35,
};

export function computeTimeSensitivity(topicBundles: TopicBundleCollection, snapshot: ChartSnapshot): TimeSensitivity {
  const lagnaLord = lordOfHouse(snapshot, 1);
  const bundles = Object.values(topicBundles);
  const birthTimeConfidence = snapshot.birth_time_confidence ?? "unknown";

  let weightedSignals = 0;
  for (const bundle of bundles) {
    const houses = Object.keys(bundle.houses).map((value) => Number(value));
    const cardinalHits = houses.filter((house) => cardinalHouses.has(house)).length;
    const usesLagnaLord = lagnaLord in bundle.planets;

    if (cardinalHits > 0) {
      weightedSignals += 1 + Math.max(0, cardinalHits - 1) * 0.25;
    }

    if (usesLagnaLord) {
      weightedSignals += 0.75;
    }
  }

  const rawShare = bundles.length === 0 ? 0 : weightedSignals / (bundles.length * 2);
  const weightedShare = rawShare * confidenceFactor[birthTimeConfidence];

  const overall = weightedShare >= 0.42 ? "high" : weightedShare >= 0.2 ? "medium" : "low";
  const note = `${Math.round(rawShare * 100)}% of bundles lean on lagna/cardinal-house factors; birth time is ${birthTimeConfidence}, so the sensitivity reads ${overall}.`;

  return TimeSensitivitySchema.parse({ overall, note });
}
