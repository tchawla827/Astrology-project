import { z } from "zod";

import { TopicSchema, type Topic } from "@/lib/schemas";

export const AskClassificationSchema = z.object({
  topic: TopicSchema,
  needs_timing: z.boolean(),
  needs_technical_depth: z.boolean(),
  birth_time_sensitive: z.boolean(),
  is_mixed: z.boolean(),
  matched_terms: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
});

export type AskClassification = z.infer<typeof AskClassificationSchema>;

export type ProfileSummaryForClassification = {
  lagna?: string;
  moon_sign?: string;
  birth_time_confidence?: "exact" | "approximate" | "unknown";
};

const topicKeywords: Record<Topic, string[]> = {
  personality: ["personality", "nature", "temperament", "self", "identity", "mind", "strength", "weakness", "pattern"],
  career: ["career", "job", "work", "profession", "business", "promotion", "boss", "office", "startup", "blocked"],
  wealth: ["money", "wealth", "income", "finance", "financial", "salary", "asset", "savings", "debt", "profit"],
  relationships: ["relationship", "relationships", "partner", "dating", "love", "romance", "breakup", "attachment"],
  marriage: ["marriage", "married", "spouse", "husband", "wife", "commitment", "wedding", "delay"],
  family: ["family", "mother", "father", "parent", "parents", "sibling", "children", "home"],
  health: ["health", "illness", "disease", "stress", "anxiety", "body", "energy", "sleep", "routine"],
  education: ["education", "study", "college", "school", "exam", "degree", "learning", "research"],
  spirituality: ["spiritual", "spirituality", "karma", "meditation", "detached", "purpose", "faith", "practice"],
  relocation: ["relocation", "abroad", "foreign", "move", "moving", "migration", "settle", "travel", "city", "country"],
};

const timingKeywords = ["when", "timing", "period", "phase", "dasha", "antardasha", "transit", "end", "start", "soon"];
const technicalKeywords = ["chart", "house", "lord", "lagna", "d10", "d9", "navamsa", "bhava", "yoga", "aspect", "planet"];
const birthTimeKeywords = ["lagna", "ascendant", "house", "bhava", "d10", "d9", "navamsa", "marriage", "career", "relocation"];
const topicDefault: Topic = "personality";

function normalizeQuestion(question: string) {
  return question.toLowerCase().replace(/[^\w\s]/g, " ");
}

function countMatches(normalizedQuestion: string, keywords: string[]) {
  const matched: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(normalizedQuestion)) {
      matched.push(keyword);
      score += keyword.length > 5 ? 2 : 1;
    }
  }

  return { score, matched };
}

export async function classifyQuestion(input: {
  question: string;
  profile_summary?: ProfileSummaryForClassification;
}): Promise<AskClassification> {
  const normalized = normalizeQuestion(input.question);
  const scored = Object.entries(topicKeywords).map(([topic, keywords]) => ({
    topic: topic as Topic,
    ...countMatches(normalized, keywords),
  }));
  scored.sort((left, right) => right.score - left.score);

  const primary = scored[0]?.score ? scored[0] : { topic: topicDefault, score: 0, matched: [] };
  const secondary = scored.filter((entry) => entry.topic !== primary.topic && entry.score > 0);
  const timing = countMatches(normalized, timingKeywords);
  const technical = countMatches(normalized, technicalKeywords);
  const birthTime = countMatches(normalized, birthTimeKeywords);
  const isMixed = secondary.some((entry) => entry.score >= Math.max(2, primary.score - 1));
  const matchedTerms = [...primary.matched, ...timing.matched, ...technical.matched].filter(
    (value, index, values) => values.indexOf(value) === index,
  );

  const confidence =
    primary.score >= 4 && !isMixed ? "high" : primary.score > 0 || timing.score > 0 || technical.score > 0 ? "medium" : "low";

  return AskClassificationSchema.parse({
    topic: primary.topic,
    needs_timing: timing.score > 0,
    needs_technical_depth: technical.score > 0,
    birth_time_sensitive: birthTime.score > 0 || primary.topic !== "spirituality",
    is_mixed: isMixed,
    matched_terms: matchedTerms,
    confidence,
  });
}
