import type { Topic, TopicBundleCollection } from "@/lib/schemas";
import type { TopicBlueprint } from "@/lib/derived/shared";
import { careerTopic } from "@/lib/derived/topics/career";
import { educationTopic } from "@/lib/derived/topics/education";
import { familyTopic } from "@/lib/derived/topics/family";
import { healthTopic } from "@/lib/derived/topics/health";
import { marriageTopic } from "@/lib/derived/topics/marriage";
import { personalityTopic } from "@/lib/derived/topics/personality";
import { relationshipsTopic } from "@/lib/derived/topics/relationships";
import { relocationTopic } from "@/lib/derived/topics/relocation";
import { spiritualityTopic } from "@/lib/derived/topics/spirituality";
import { wealthTopic } from "@/lib/derived/topics/wealth";

export const topicBlueprints: Record<Topic, TopicBlueprint> = {
  personality: personalityTopic,
  career: careerTopic,
  wealth: wealthTopic,
  relationships: relationshipsTopic,
  marriage: marriageTopic,
  family: familyTopic,
  health: healthTopic,
  education: educationTopic,
  spirituality: spiritualityTopic,
  relocation: relocationTopic,
};

export const topicOrder = Object.keys(topicBlueprints) as Array<keyof TopicBundleCollection>;
