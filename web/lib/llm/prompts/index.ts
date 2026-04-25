import type { Topic } from "@/lib/schemas";
import { systemPromptV1 } from "@/lib/llm/prompts/system_v1";
import { userPromptV1 } from "@/lib/llm/prompts/user_v1";
import { routePromptFor } from "@/lib/llm/prompts/route";

export const PROMPT_VERSIONS = {
  system: "system_v1",
  route: {
    personality: "route_personality_v1",
    career: "route_career_v1",
    wealth: "route_wealth_v1",
    relationships: "route_relationships_v1",
    marriage: "route_marriage_v1",
    family: "route_family_v1",
    health: "route_health_v1",
    education: "route_education_v1",
    spirituality: "route_spirituality_v1",
    relocation: "route_relocation_v1",
  } satisfies Record<Topic, string>,
  daily_route: "route_daily_v1",
  user: "user_v1",
  answer_schema: "answer_v1",
  daily_answer_schema: "daily_v1",
} as const;

export { routePromptFor, systemPromptV1, userPromptV1 };
