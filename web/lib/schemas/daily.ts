import { z } from "zod";

export const DailyPlanetSchema = z.enum(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]);
export const DailyToneModeSchema = z.enum(["balanced", "direct", "brutal"]);
export const DailyAspectSchema = z.enum(["love", "emotional", "career", "focus"]);
export const DailyAspectScoreLabelSchema = z.enum(["low", "mixed", "steady", "strong"]);
export const DailyScoreComponentSchema = z.object({
  natal_promise: z.number().min(-12).max(12),
  dasha_activation: z.number().min(-18).max(18),
  varga_support: z.number().min(-12).max(12),
  transit_trigger: z.number().min(-16).max(16),
  daily_moon: z.number().min(-8).max(8),
  yoga_modifier: z.number().min(-8).max(8),
  volatility_penalty: z.number().min(0).max(12),
});

export const DailyScoreBreakdownSchema = z.object({
  aspect: DailyAspectSchema,
  raw_score: z.number().min(0).max(100),
  components: DailyScoreComponentSchema,
  source_charts: z.array(z.string().min(1)).max(8),
  notes: z.array(z.string().min(1)).max(12),
});

export const DailyAspectScoreSchema = z.object({
  aspect: DailyAspectSchema,
  score: z.number().int().min(1).max(100),
  label: DailyAspectScoreLabelSchema,
  sentence: z.string().min(1).max(160),
  basis: z.object({
    houses: z.array(z.number().int().min(1).max(12)).max(6),
    planets: z.array(DailyPlanetSchema).max(6),
    transit_rules: z.array(z.string().min(1)).max(6),
  }),
});

const requiredDailyAspects = DailyAspectSchema.options;

export const DailyPredictionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verdict: z.string().min(1).max(280),
  felt_sense: z.string().min(1).max(160),
  aspect_scores: z.array(DailyAspectScoreSchema).length(requiredDailyAspects.length).superRefine((scores, context) => {
    const seen = new Set(scores.map((score) => score.aspect));
    for (const aspect of requiredDailyAspects) {
      if (!seen.has(aspect)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing daily aspect score for ${aspect}.`,
        });
      }
    }
  }),
  favorable: z.array(z.string().min(1)).max(5),
  caution: z.array(z.string().min(1)).max(5),
  technical_basis: z.object({
    triggered_houses: z.array(z.number().int().min(1).max(12)),
    planets_used: z.array(DailyPlanetSchema),
    transit_rules: z.array(z.string().min(1)),
  }),
  score_breakdown: z.array(DailyScoreBreakdownSchema).length(requiredDailyAspects.length).optional(),
  tone: DailyToneModeSchema,
  answer_schema_version: z.literal("daily_v2"),
});

export type DailyPrediction = z.infer<typeof DailyPredictionSchema>;
export type DailyAspectScore = z.infer<typeof DailyAspectScoreSchema>;
export type DailyScoreBreakdown = z.infer<typeof DailyScoreBreakdownSchema>;
