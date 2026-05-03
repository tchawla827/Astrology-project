import type { ToneMode, DepthMode } from "@/lib/schemas";
import type { AskContextBundle } from "@/lib/llm/buildContext";

const toneGuidance: Record<ToneMode, string> = {
  balanced: "Use measured language. No exclamation. No dramatic absolutes.",
  direct: "Say it plainly in the verdict. Skip cushioning phrases like 'you may find'.",
  brutal:
    "Be blunt. Call delay 'delay', weakness 'weakness', friction 'friction'. Only sharpen the message when the context supports it.",
};

const depthGuidance: Record<DepthMode, string> = {
  simple: "Keep explanations readable. Use chart terms only when they materially support the verdict.",
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
    confidence_note: context.confidence_note,
    time_sensitivity: context.time_sensitivity,
    allowed_citations: context.allowed_citations,
  };
}

export function userPromptV1(input: {
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

Context:
${JSON.stringify(promptContext(input.context_bundle), null, 2)}

Question:
${input.question}

Return ONLY JSON matching AskAnswer schema.`;
}
