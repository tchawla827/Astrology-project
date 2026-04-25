import { z } from "zod";

export const DailyPlanetSchema = z.enum(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]);
export const DailyToneModeSchema = z.enum(["balanced", "direct", "brutal"]);

export const DailyPredictionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verdict: z.string().min(1).max(280),
  favorable: z.array(z.string().min(1)).max(5),
  caution: z.array(z.string().min(1)).max(5),
  technical_basis: z.object({
    triggered_houses: z.array(z.number().int().min(1).max(12)),
    planets_used: z.array(DailyPlanetSchema),
    transit_rules: z.array(z.string().min(1)),
  }),
  tone: DailyToneModeSchema,
  answer_schema_version: z.literal("daily_v1"),
});

export type DailyPrediction = z.infer<typeof DailyPredictionSchema>;
