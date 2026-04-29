import { z } from "zod";
import { DailyPredictionSchema, type DailyPrediction } from "@/lib/schemas/daily";

export const ToneModeSchema = z.enum(["balanced", "direct", "brutal"]);
export const DepthModeSchema = z.enum(["simple", "technical"]);
export const PlanetSchema = z.enum(["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]);
export const ChartKeySchema = z.enum([
  "D1",
  "Bhava",
  "Moon",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
  "D10",
  "D11",
  "D12",
  "D16",
  "D20",
  "D24",
  "D27",
  "D30",
  "D40",
  "D45",
  "D60",
]);
export const TopicSchema = z.enum([
  "personality",
  "career",
  "wealth",
  "relationships",
  "marriage",
  "family",
  "health",
  "education",
  "spirituality",
  "relocation",
]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  default_tone_mode: ToneModeSchema,
  subscription_tier: z.enum(["free", "premium"]),
  created_at: z.string(),
});

export const BirthProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  birth_date: z.string(),
  birth_time: z.string(),
  birth_time_confidence: z.enum(["exact", "approximate", "unknown"]),
  birth_place_text: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  ayanamsha: z.enum(["lahiri", "raman", "kp"]),
  engine_version: z.string(),
  status: z.enum(["processing", "ready", "error"]),
  created_at: z.string(),
});

export const PlanetInChartSchema = z.object({
  planet: PlanetSchema,
  sign: z.string(),
  house: z.number().int().min(1).max(12),
  longitude_deg: z.number().optional(),
  retrograde: z.boolean().optional(),
  combust: z.boolean().optional(),
  varga_symbolic_combust: z.boolean().optional(),
  dignity: z.enum(["exalted", "moolatrikona", "own", "friendly", "neutral", "enemy", "debilitated"]).optional(),
});

export const HousePlacementSchema = z.object({
  house: z.number().int().min(1).max(12),
  sign: z.string(),
  lord: PlanetSchema,
});

export const AspectSchema = z.object({
  from: PlanetSchema,
  to: z.union([PlanetSchema, z.number().int().min(1).max(12)]),
  kind: z.enum(["conjunction", "opposition", "trine", "square", "graha_drishti"]),
  orb_deg: z.number().optional(),
});

export const ChartSchema = z.object({
  chart_key: ChartKeySchema,
  ascendant_sign: z.string(),
  ascendant_longitude_deg: z.number().optional(),
  houses: z.array(HousePlacementSchema).length(12),
  planets: z.array(PlanetInChartSchema),
  aspects: z.array(AspectSchema).optional(),
});

export const PlanetPlacementSchema = z.object({
  planet: PlanetSchema,
  longitude_deg: z.number(),
  sign: z.string(),
  house: z.number().int().min(1).max(12),
  nakshatra: z.string(),
  pada: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  retrograde: z.boolean(),
  combust: z.boolean(),
  dignity: z.enum(["exalted", "moolatrikona", "own", "friendly", "neutral", "enemy", "debilitated"]),
});

export const YogaSchema = z.object({
  name: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  source_charts: z.array(z.string()),
  planets_involved: z.array(PlanetSchema),
  notes: z.array(z.string()),
});

export const DashaPeriodSchema = z.object({
  lord: PlanetSchema,
  start: z.string(),
  end: z.string(),
});

export const DashaSummarySchema = z.object({
  system: z.literal("vimshottari"),
  current_mahadasha: DashaPeriodSchema,
  current_antardasha: DashaPeriodSchema,
  upcoming: z.array(DashaPeriodSchema),
});

export const DashaTimelineSchema = z.object({
  system: z.literal("vimshottari"),
  periods: z.array(
    z.object({
      level: z.enum(["mahadasha", "antardasha", "pratyantardasha"]),
      lord: PlanetSchema,
      start: z.string(),
      end: z.string(),
    })
  ),
});

export const TransitOverlaySchema = z.object({
  triggered_houses: z.array(z.number().int().min(1).max(12)),
  planet_to_house: z.record(PlanetSchema, z.number().int().min(1).max(12)),
});

export const TransitSummarySchema = z.object({
  as_of: z.string(),
  positions: z.array(PlanetPlacementSchema),
  highlights: z.array(z.string()),
  overlay: TransitOverlaySchema.nullable().optional(),
});

const ChartCollectionSchema = z.record(z.string(), ChartSchema);

export const ChartSnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  birth_profile_id: z.string().uuid().optional(),
  engine_version: z.string(),
  computed_at: z.string().optional(),
  birth_time_confidence: z.enum(["exact", "approximate", "unknown"]).optional(),
  summary: z.object({
    lagna: z.string(),
    moon_sign: z.string(),
    nakshatra: z.string(),
    pada: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }),
  charts: ChartCollectionSchema,
  planetary_positions: z.array(PlanetPlacementSchema),
  aspects: z.array(AspectSchema),
  yogas: z.array(YogaSchema),
  dasha: DashaSummarySchema,
  transits: TransitSummarySchema,
  lagna_longitude_deg: z.number().optional(),
});

export const TopicBundleSchema = z.object({
  topic: TopicSchema,
  charts_used: z.array(z.string()),
  headline_signals: z.array(z.string()),
  houses: z.record(
    z.coerce.number().int().min(1).max(12),
    z.object({ summary: z.string(), strength: z.enum(["low", "medium", "high"]) })
  ),
  planets: z.record(PlanetSchema, z.object({ role: z.string(), summary: z.string() })),
  timing: z.object({
    current_mahadasha: z.string(),
    current_antardasha: z.string(),
    current_trigger_notes: z.array(z.string()),
  }),
  confidence_note: z.string(),
});

export const FocusCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  why: z.object({
    charts: z.array(z.string()),
    houses: z.array(z.number().int().min(1).max(12)),
    planets: z.array(PlanetSchema),
  }),
});

export const DashboardSummarySchema = z.object({
  top_themes: z.array(z.string()).min(2).max(4),
  focus_cards: z.array(FocusCardSchema).min(1).max(3),
});

export const TimeSensitivitySchema = z.object({
  overall: z.enum(["low", "medium", "high"]),
  note: z.string(),
});

export const TopicBundleCollectionSchema = z.object({
  personality: TopicBundleSchema,
  career: TopicBundleSchema,
  wealth: TopicBundleSchema,
  relationships: TopicBundleSchema,
  marriage: TopicBundleSchema,
  family: TopicBundleSchema,
  health: TopicBundleSchema,
  education: TopicBundleSchema,
  spirituality: TopicBundleSchema,
  relocation: TopicBundleSchema,
});

export const DerivedFeaturePayloadSchema = z.object({
  topic_bundles: TopicBundleCollectionSchema,
  dashboard_summary: DashboardSummarySchema,
  time_sensitivity: TimeSensitivitySchema,
});

export const DerivedFeatureSnapshotSchema = DerivedFeaturePayloadSchema.extend({
  id: z.string().uuid(),
  birth_profile_id: z.string().uuid(),
  chart_snapshot_id: z.string().uuid(),
  schema_version: z.string(),
  computed_at: z.string(),
});

export const AskSessionSchema = z.object({
  id: z.string().uuid(),
  birth_profile_id: z.string().uuid(),
  topic: z.union([TopicSchema, z.literal("mixed")]),
  tone_mode: ToneModeSchema,
  created_at: z.string(),
});

export const AskAnswerSchema = z.object({
  verdict: z.string().min(1).max(280),
  why: z.array(z.string().min(1)).min(1).max(5),
  timing: z.object({
    summary: z.string().min(1),
    type: z.array(z.enum(["natal", "dasha", "transit"])).min(1),
  }),
  confidence: z.object({
    level: z.enum(["high", "medium", "low"]),
    note: z.string().min(1),
  }),
  advice: z.array(z.string().min(1)).max(5),
  technical_basis: z.object({
    charts_used: z.array(z.string()).min(1),
    houses_used: z.array(z.number().int().min(1).max(12)).min(1),
    planets_used: z.array(PlanetSchema).min(1),
  }),
});

export const LlmMetadataSchema = z.object({
  provider: z.enum(["gemini", "groq"]),
  model: z.string(),
  prompt_version: z.string(),
  prompt_versions: z.object({
    system: z.string(),
    route: z.string(),
    user: z.string(),
  }).optional(),
  answer_schema_version: z.string(),
  context_bundle_type: z.union([TopicSchema, z.literal("mixed"), z.literal("daily")]),
  context_bundle_id: z.string().optional(),
  classification: z.object({
    topic: TopicSchema,
    needs_timing: z.boolean(),
    needs_technical_depth: z.boolean(),
    birth_time_sensitive: z.boolean(),
    is_mixed: z.boolean(),
    matched_terms: z.array(z.string()),
    confidence: z.enum(["low", "medium", "high"]),
  }).optional(),
  repaired_from_provider: z.enum(["gemini", "groq"]).optional(),
  latency_ms: z.number().int().nonnegative(),
  tokens_in: z.number().int().nonnegative().optional(),
  tokens_out: z.number().int().nonnegative().optional(),
});

export const UserAskMessageSchema = z.object({
  id: z.string().uuid(),
  ask_session_id: z.string().uuid(),
  role: z.literal("user"),
  content: z.string(),
  created_at: z.string(),
});

export const AssistantAskMessageSchema = z.object({
  id: z.string().uuid(),
  ask_session_id: z.string().uuid(),
  role: z.literal("assistant"),
  content_structured: AskAnswerSchema,
  llm_metadata: LlmMetadataSchema,
  created_at: z.string(),
});

export const AskMessageSchema = z.discriminatedUnion("role", [UserAskMessageSchema, AssistantAskMessageSchema]);

export const PanchangSchema = z.object({
  date: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  tithi: z.union([
    z.object({ name: z.string(), end_time: z.string() }),
    z.object({ name: z.string(), fraction_left: z.number() }),
  ]),
  nakshatra: z.union([
    z.object({ name: z.string(), end_time: z.string() }),
    z.object({ name: z.string(), fraction_left: z.number() }),
  ]),
  yoga: z.union([
    z.object({ name: z.string(), end_time: z.string() }),
    z.object({ name: z.string(), fraction_left: z.number() }),
  ]),
  karana: z.union([
    z.object({ name: z.string(), end_time: z.string() }),
    z.object({ name: z.string(), fraction_left: z.number() }),
  ]),
  vaara: z.string(),
  sunrise: z.string(),
  sunset: z.string(),
  ayanamsha_deg: z.number().optional(),
  sidereal_time: z.string().optional(),
  muhurta_windows: z.array(
    z.object({
      name: z.string(),
      start: z.string(),
      end: z.string(),
      kind: z.enum(["auspicious", "inauspicious"]),
    })
  ).optional(),
});

export type ToneMode = z.infer<typeof ToneModeSchema>;
export type DepthMode = z.infer<typeof DepthModeSchema>;
export type Planet = z.infer<typeof PlanetSchema>;
export type ChartKey = z.infer<typeof ChartKeySchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type User = z.infer<typeof UserSchema>;
export type BirthProfile = z.infer<typeof BirthProfileSchema>;
export type ChartSnapshot = z.infer<typeof ChartSnapshotSchema>;
export type Chart = z.infer<typeof ChartSchema>;
export type PlanetPlacement = z.infer<typeof PlanetPlacementSchema>;
export type PlanetInChart = z.infer<typeof PlanetInChartSchema>;
export type HousePlacement = z.infer<typeof HousePlacementSchema>;
export type Aspect = z.infer<typeof AspectSchema>;
export type Yoga = z.infer<typeof YogaSchema>;
export type DashaSummary = z.infer<typeof DashaSummarySchema>;
export type DashaTimeline = z.infer<typeof DashaTimelineSchema>;
export type DashaPeriod = z.infer<typeof DashaPeriodSchema>;
export type TransitOverlay = z.infer<typeof TransitOverlaySchema>;
export type TransitSummary = z.infer<typeof TransitSummarySchema>;
export type DerivedFeatureSnapshot = z.infer<typeof DerivedFeatureSnapshotSchema>;
export type DerivedFeaturePayload = z.infer<typeof DerivedFeaturePayloadSchema>;
export type TopicBundle = z.infer<typeof TopicBundleSchema>;
export type TopicBundleCollection = z.infer<typeof TopicBundleCollectionSchema>;
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
export type FocusCard = z.infer<typeof FocusCardSchema>;
export type TimeSensitivity = z.infer<typeof TimeSensitivitySchema>;
export type AskSession = z.infer<typeof AskSessionSchema>;
export type AskMessage = z.infer<typeof AskMessageSchema>;
export type AskAnswer = z.infer<typeof AskAnswerSchema>;
export type LlmMetadata = z.infer<typeof LlmMetadataSchema>;
export { DailyPredictionSchema };
export type { DailyPrediction };
export type Panchang = z.infer<typeof PanchangSchema>;
