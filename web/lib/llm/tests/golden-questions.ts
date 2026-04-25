import { computeBundles } from "@/lib/derived/computeBundles";
import type { AskAnswer, Planet, Topic } from "@/lib/schemas";
import type { LlmProvider } from "@/lib/llm/providers";
import type { AskContextBundle } from "@/lib/llm/buildContext";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

export type GoldenQuestionCase = {
  name: string;
  question: string;
  expected_topic: Topic;
  min_charts_cited: string[];
  min_planets_cited: Planet[];
};

export const goldenQuestionCases: GoldenQuestionCase[] = [
  {
    name: "career blockage",
    question: "Why has my career felt blocked lately?",
    expected_topic: "career",
    min_charts_cited: ["D1", "D10"],
    min_planets_cited: ["Saturn"],
  },
  {
    name: "marriage delay",
    question: "Is marriage delayed in my chart?",
    expected_topic: "marriage",
    min_charts_cited: ["D1", "D9"],
    min_planets_cited: ["Venus", "Jupiter"],
  },
  {
    name: "money pressure",
    question: "Why does money feel tight even when income improves?",
    expected_topic: "wealth",
    min_charts_cited: ["D1", "D2"],
    min_planets_cited: ["Jupiter", "Venus"],
  },
  {
    name: "moving abroad",
    question: "Does my chart support moving abroad?",
    expected_topic: "relocation",
    min_charts_cited: ["D1", "D12"],
    min_planets_cited: ["Rahu"],
  },
  {
    name: "study direction",
    question: "What does my chart say about education and serious study?",
    expected_topic: "education",
    min_charts_cited: ["D1", "D24"],
    min_planets_cited: ["Mercury", "Jupiter"],
  },
];

export const goldenDerivedPayload = computeBundles(goldenSnapshot, { onboardingIntent: "career" });

function overlap<T>(left: T[], right: T[]) {
  return left.some((value) => right.includes(value));
}

export function buildMockAnswer(context: Pick<AskContextBundle, "topic" | "allowed_citations" | "headline_signals" | "timing">): AskAnswer {
  const firstSignal = context.headline_signals[0] ?? `${context.topic} has mixed but readable support.`;
  const firstPlanet = context.allowed_citations.planets[0] ?? "Saturn";
  const secondPlanet = context.allowed_citations.planets[1] ?? firstPlanet;
  const firstHouse = context.allowed_citations.houses[0] ?? 1;
  const firstChart = context.allowed_citations.charts[0] ?? "D1";
  const secondChart = context.allowed_citations.charts[1] ?? firstChart;

  return {
    verdict: `${context.topic} is active, but the chart shows a mixed path rather than a clean yes.`,
    why: [
      firstSignal,
      `${firstPlanet} and ${secondPlanet} are the strongest supplied factors for this question.`,
    ],
    timing: {
      summary: context.timing.current_antardasha,
      type: ["natal", "dasha"],
    },
    confidence: {
      level: "high",
      note: "The answer is based only on the supplied topic bundle.",
    },
    advice: ["Act on the strongest signal first and avoid forcing weak areas."],
    technical_basis: {
      charts_used: [firstChart, secondChart].filter((value, index, values) => values.indexOf(value) === index),
      houses_used: [firstHouse],
      planets_used: [firstPlanet, secondPlanet].filter((value, index, values) => values.indexOf(value) === index),
    },
  };
}

export function assertGoldenAnswer(input: {
  testCase: GoldenQuestionCase;
  topic: Topic;
  answer: AskAnswer;
}) {
  if (input.topic !== input.testCase.expected_topic) {
    throw new Error(`Expected topic ${input.testCase.expected_topic}, got ${input.topic}.`);
  }
  if (!overlap(input.answer.technical_basis.charts_used, input.testCase.min_charts_cited)) {
    throw new Error(`Answer did not cite an expected chart for ${input.testCase.name}.`);
  }
  if (!overlap(input.answer.technical_basis.planets_used, input.testCase.min_planets_cited)) {
    throw new Error(`Answer did not cite an expected planet for ${input.testCase.name}.`);
  }
  if (input.answer.verdict.length < 20 || input.answer.verdict.length > 280) {
    throw new Error(`Verdict length is out of bounds for ${input.testCase.name}.`);
  }
}

export function createRecordedProvider(answerForTopic: (topic: Topic) => AskAnswer): LlmProvider {
  return {
    name: "gemini",
    defaultModel: "recorded-gemini",
    async generate(args) {
      const content = args.messages.map((message) => message.content).join("\n");
      const topic = (content.match(/"topic":\s*"([^"]+)"/)?.[1] ?? "personality") as Topic;
      return {
        output: answerForTopic(topic),
        tokens_in: 100,
        tokens_out: 90,
        latency_ms: 3,
      };
    },
  };
}
