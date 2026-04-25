import type { ChartSnapshot, DerivedFeaturePayload, Topic } from "@/lib/schemas";
import { topicTitles } from "@/lib/derived/shared";

const generalStarters = [
  "What is the strongest pattern in my chart right now?",
  "What should I stop forcing this month?",
  "Where am I underusing my chart's strengths?",
  "What does my current dasha want from me?",
];

const topicStarters: Record<Topic, string[]> = {
  personality: [
    "What is my core personality edge?",
    "Why do I repeat the same pattern?",
    "What part of myself should I trust more?",
  ],
  career: [
    "Why has my career felt stuck?",
    "What kind of work fits my chart?",
    "When does career pressure ease?",
  ],
  wealth: [
    "What is my money pattern?",
    "Where does my chart show income potential?",
    "What should I avoid financially right now?",
  ],
  relationships: [
    "What is my relationship pattern?",
    "Why do I attract the same kind of partner?",
    "What should I change in how I handle love?",
  ],
  marriage: [
    "What does my chart say about commitment?",
    "Why does marriage feel delayed?",
    "What should I watch before choosing a partner?",
  ],
  family: [
    "What family pattern am I meant to understand?",
    "How should I handle home pressure?",
    "What does my chart show about parents and support?",
  ],
  health: [
    "Where does my chart show stress patterns?",
    "What routines support my current period?",
    "When should I avoid overexertion?",
  ],
  education: [
    "What learning path fits my chart?",
    "Why do studies feel blocked?",
    "What should I focus on academically now?",
  ],
  spirituality: [
    "What is my spiritual learning curve?",
    "Why do I feel detached lately?",
    "Which practices fit this period?",
  ],
  relocation: [
    "Does relocation suit my chart?",
    "What should I consider before moving?",
    "Is a foreign place helpful for my growth?",
  ],
};

function stableIndex(seed: string, length: number) {
  if (length <= 0) {
    return 0;
  }
  return Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % length;
}

function weakestTopic(derived: DerivedFeaturePayload): Topic | null {
  let selected: { topic: Topic; lowCount: number } | null = null;

  for (const [topic, bundle] of Object.entries(derived.topic_bundles) as [Topic, DerivedFeaturePayload["topic_bundles"][Topic]][]) {
    const lowCount = Object.values(bundle.houses).filter((house) => house.strength === "low").length;
    if (!selected || lowCount > selected.lowCount) {
      selected = { topic, lowCount };
    }
  }

  return selected?.lowCount ? selected.topic : null;
}

export function buildStarterQuestions(input: {
  derived: DerivedFeaturePayload;
  snapshot: ChartSnapshot;
  topic?: Topic;
}) {
  const candidates = new Set<string>();
  const primaryTopic = input.topic ?? weakestTopic(input.derived);

  if (primaryTopic) {
    topicStarters[primaryTopic].forEach((question) => candidates.add(question));
  }

  const careerBundle = input.derived.topic_bundles.career;
  if (
    Object.values(careerBundle.houses).some((house) => house.strength === "low") ||
    careerBundle.headline_signals.some((signal) => /delay|pressure|blocked|slow|stress/i.test(signal))
  ) {
    candidates.add("Why has my career felt stuck?");
  }

  candidates.add(`What does my ${input.snapshot.dasha.current_mahadasha.lord} Mahadasha want from me?`);
  candidates.add(`How should I handle ${input.snapshot.dasha.current_antardasha.lord} Antardasha right now?`);

  if (primaryTopic) {
    candidates.add(`What is the main ${topicTitles[primaryTopic].toLowerCase()} lesson in my chart?`);
  }

  generalStarters.forEach((question) => candidates.add(question));

  const ordered = [...candidates];
  const start = stableIndex(
    `${input.snapshot.summary.lagna}:${input.snapshot.summary.moon_sign}:${primaryTopic ?? "general"}`,
    ordered.length,
  );

  return [...ordered.slice(start), ...ordered.slice(0, start)].slice(0, 6);
}
