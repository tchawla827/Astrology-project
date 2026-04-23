import { z } from "zod";
import tzLookup from "tz-lookup";

const AyanamshaSchema = z.enum(["lahiri", "raman", "kp"]);
const BirthTimeConfidenceSchema = z.enum(["exact", "approximate", "unknown"]);
export const OnboardingIntentSchema = z.enum(["know-self", "career", "marriage", "health", "spirituality", "full-chart"]);

export const ProfileSubmissionSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80, "Name must be 80 characters or less."),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date is required."),
  birth_time: z.string().optional(),
  birth_time_confidence: BirthTimeConfidenceSchema,
  birth_place_text: z.string().trim().min(1, "Select a resolved birth place."),
  latitude: z.coerce.number().min(-90, "Latitude is invalid.").max(90, "Latitude is invalid."),
  longitude: z.coerce.number().min(-180, "Longitude is invalid.").max(180, "Longitude is invalid."),
  timezone: z.string().trim().min(1, "Timezone is required."),
  ayanamsha: AyanamshaSchema.default("lahiri"),
  onboarding_intent: OnboardingIntentSchema.optional(),
});

export type ProfileSubmission = z.infer<typeof ProfileSubmissionSchema>;
export type NormalizedProfileSubmission = Omit<ProfileSubmission, "birth_time"> & { birth_time: string };

export type NormalizationResult =
  | { success: true; data: NormalizedProfileSubmission }
  | { success: false; errors: Record<string, string[]> };

function appendError(errors: Record<string, string[]>, field: string, message: string) {
  errors[field] = [...(errors[field] ?? []), message];
}

function normalizeBirthTime(value: string | undefined, confidence: z.infer<typeof BirthTimeConfidenceSchema>) {
  if (confidence === "unknown") {
    return "12:00:00";
  }

  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (match) {
    const hour = Number.parseInt(match[1] ?? "", 10);
    const minute = Number.parseInt(match[2] ?? "", 10);
    const second = Number.parseInt(match[3] ?? "00", 10);
    if (hour <= 23 && minute <= 59 && second <= 59) {
      return [hour, minute, second].map((part) => String(part).padStart(2, "0")).join(":");
    }
  }

  return null;
}

export function normalizeProfileSubmission(input: unknown, now = new Date()): NormalizationResult {
  const parsed = ProfileSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const errors: Record<string, string[]> = {};
  const birthDate = new Date(`${parsed.data.birth_date}T00:00:00.000Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (Number.isNaN(birthDate.getTime())) {
    appendError(errors, "birth_date", "Birth date is invalid.");
  } else if (birthDate > today) {
    appendError(errors, "birth_date", "Birth date cannot be in the future.");
  }

  const birthTime = normalizeBirthTime(parsed.data.birth_time, parsed.data.birth_time_confidence);
  if (!birthTime) {
    appendError(errors, "birth_time", "Birth time must be HH:mm or HH:mm:ss.");
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      birth_time: birthTime ?? "12:00:00",
    },
  };
}

export function resolveTimezoneFromCoordinates(latitude: number, longitude: number) {
  try {
    return tzLookup(latitude, longitude);
  } catch {
    return "UTC";
  }
}
