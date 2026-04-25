import type { Topic } from "@/lib/schemas";
import { routeCareerV1 } from "@/lib/llm/prompts/route/career_v1";
import { routeEducationV1 } from "@/lib/llm/prompts/route/education_v1";
import { routeFamilyV1 } from "@/lib/llm/prompts/route/family_v1";
import { routeHealthV1 } from "@/lib/llm/prompts/route/health_v1";
import { routeMarriageV1 } from "@/lib/llm/prompts/route/marriage_v1";
import { routePersonalityV1 } from "@/lib/llm/prompts/route/personality_v1";
import { routeRelationshipsV1 } from "@/lib/llm/prompts/route/relationships_v1";
import { routeRelocationV1 } from "@/lib/llm/prompts/route/relocation_v1";
import { routeSpiritualityV1 } from "@/lib/llm/prompts/route/spirituality_v1";
import { routeWealthV1 } from "@/lib/llm/prompts/route/wealth_v1";

export const routePromptsV1: Record<Topic, string> = {
  personality: routePersonalityV1,
  career: routeCareerV1,
  wealth: routeWealthV1,
  relationships: routeRelationshipsV1,
  marriage: routeMarriageV1,
  family: routeFamilyV1,
  health: routeHealthV1,
  education: routeEducationV1,
  spirituality: routeSpiritualityV1,
  relocation: routeRelocationV1,
};

export function routePromptFor(topic: Topic) {
  return routePromptsV1[topic];
}
