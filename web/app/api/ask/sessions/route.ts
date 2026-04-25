import { NextResponse } from "next/server";

import {
  loadAskSessionSummaries,
  resolveLatestAskProfile,
  type SupabaseAskUiClient,
} from "@/lib/server/loadAsk";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await resolveLatestAskProfile(supabase as unknown as SupabaseAskUiClient, user.id);
  if ("status" in profile) {
    if (profile.status === 404) {
      return NextResponse.json({ sessions: [] });
    }
    return NextResponse.json({ error: profile.error }, { status: profile.status });
  }

  try {
    const sessions = await loadAskSessionSummaries(supabase as unknown as SupabaseAskUiClient, profile.profileId);
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Ask sessions." },
      { status: 500 },
    );
  }
}
