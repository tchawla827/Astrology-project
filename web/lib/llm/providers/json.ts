import { LlmSchemaError } from "@/lib/llm/errors";

export function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1));
      } catch (error) {
        throw new LlmSchemaError("Provider returned text that could not be parsed as JSON.", { cause: error });
      }
    }
    throw new LlmSchemaError("Provider returned no JSON object.");
  }
}
