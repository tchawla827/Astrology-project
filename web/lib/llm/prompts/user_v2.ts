import type { ToneMode, DepthMode } from "@/lib/schemas";
import type { AskContextBundle } from "@/lib/llm/buildContext";

const toneGuidance: Record<ToneMode, string> = {
  balanced: "Use measured language. No exclamation. No dramatic absolutes.",
  direct: "Say it plainly in the verdict. Skip cushioning phrases like 'you may find'.",
  brutal:
    "Be blunt. Call delay 'delay', weakness 'weakness', friction 'friction'. Only sharpen the message when the context supports it.",
};

const depthGuidance: Record<DepthMode, string> = {
  simple:
    "The explanation must simply elaborate the verdict in everyday language. Do not use astrology terms in explanation; keep chart factors only in why and technical_basis.",
  technical: "Show the house, planet, chart, dasha, or transit logic behind the answer.",
};

function promptContext(context: AskContextBundle) {
  return {
    topic: context.topic,
    profile_summary: context.profile_summary,
    selected_day_facts: context.day_context,
    birth_time_confidence: context.birth_time_confidence,
    charts_used: context.charts_used,
    headline_signals: context.headline_signals,
    houses: context.houses,
    planets: context.planets,
    timing: context.timing,
    topic_evidence: context.topic_evidence,
    confidence_note: context.confidence_note,
    time_sensitivity: context.time_sensitivity,
    allowed_citations: context.allowed_citations,
  };
}

export function userPromptV2(input: {
  context_bundle: AskContextBundle;
  question: string;
  tone: ToneMode;
  depth: DepthMode;
}) {
  const dayInstruction = input.context_bundle.day_context
    ? `Selected day instruction: The user is asking about ${input.context_bundle.day_context.requested_date}. Treat selected_day_facts as the primary transit/date context. Do not substitute today's transits, do not infer missing facts, and cite only factors listed in allowed_citations.`
    : "Selected day instruction: No selected-day facts are attached.";

  return `Tone: ${input.tone}
Tone guidance: ${toneGuidance[input.tone]}
Depth: ${input.depth}
Depth guidance: ${depthGuidance[input.depth]}
${dayInstruction}
Evidence instruction: If topic_evidence is present, treat it as the primary reading. Start from its verdict, use its primary_factors, supporting_factors, friction_factors, timing_factors, confidence, and birth_time_sensitivity. Do not contradict it unless the user asks about a different topic or the evidence is explicitly missing.

Context:
${JSON.stringify(promptContext(input.context_bundle), null, 2)}

Question:
${input.question}

Simple depth rule: if Depth is simple, explanation must not mention chart labels, houses, planets, dashas, transits, signs, yogas, aspects, or other astrology jargon. It should only make the verdict clearer in normal language.

Return ONLY JSON matching AskAnswer schema in this order. timing.type must contain one or more of "natal", "dasha", or "transit":
{
  "verdict": "one plain sentence; keep the verdict itself direct",
  "explanation": "3-5 short sentences expanding that verdict in more detail; simple depth uses no astrology terms",
  "advice": ["0-5 practical actions; this is the what-to-do section"],
  "why": ["1-5 grounded chart reasons tied to supplied factors"],
  "timing": { "summary": "timing summary", "type": ["natal"] },
  "confidence": { "level": "high|medium|low", "note": "why this confidence level" },
  "technical_basis": {
    "charts_used": ["D1"],
    "houses_used": [1],
    "planets_used": ["Sun"]
  }
}`;
}
