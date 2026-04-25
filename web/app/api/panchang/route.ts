import { NextResponse } from "next/server";
import { z } from "zod";

import { LlmContextError } from "@/lib/llm/errors";
import { loadPanchang, type SupabasePanchangClient } from "@/lib/server/loadPanchang";
import { createClient } from "@/lib/supabase/server";

const PanchangQuerySchema = z.object({
  date: z.string().default("today"),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  tz: z.string().optional(),
  loc: z.string().optional(),
  profile_id: z.string().uuid().optional(),
});

function overrideFromQuery(query: z.infer<typeof PanchangQuerySchema>) {
  const hasAny = query.lat !== undefined || query.lon !== undefined || query.tz !== undefined;
  if (!hasAny) {
    return undefined;
  }
  if (query.lat === undefined || query.lon === undefined || !query.tz) {
    throw new LlmContextError("Panchang location override requires lat, lon, and tz.");
  }
  return {
    latitude: query.lat,
    longitude: query.lon,
    timezone: query.tz,
    label: query.loc,
  };
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = PanchangQuerySchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    lat: url.searchParams.get("lat") ?? undefined,
    lon: url.searchParams.get("lon") ?? undefined,
    tz: url.searchParams.get("tz") ?? undefined,
    loc: url.searchParams.get("loc") ?? undefined,
    profile_id: url.searchParams.get("profile_id") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await loadPanchang({
      supabase: supabase as unknown as SupabasePanchangClient,
      userId: user.id,
      profileId: parsed.data.profile_id,
      date: parsed.data.date,
      override: overrideFromQuery(parsed.data),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LlmContextError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Panchang failed." }, { status: 500 });
  }
}
