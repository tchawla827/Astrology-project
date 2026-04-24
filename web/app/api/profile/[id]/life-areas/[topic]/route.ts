import { NextResponse, type NextRequest } from "next/server";

import { isSupportedLifeAreaTopic, renderLifeArea } from "@/lib/life-areas/render";
import { loadLifeAreaContext, type SupabaseLifeAreaClient } from "@/lib/server/loadLifeArea";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: { id: string; topic: string } }) {
  if (!isSupportedLifeAreaTopic(params.topic)) {
    return NextResponse.json({ error: "Life area topic not found." }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await loadLifeAreaContext(supabase as unknown as SupabaseLifeAreaClient, user.id, params.id);
  if (context.status === "empty") {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (context.status === "processing") {
    return NextResponse.json({ error: "Profile generation is still running." }, { status: 409 });
  }

  if (context.status === "error") {
    return NextResponse.json({ error: context.errorMessage ?? "Life area data is unavailable." }, { status: 500 });
  }

  if (context.status !== "ready") {
    return NextResponse.json({ error: "Life area data is unavailable." }, { status: 500 });
  }

  const bundle = context.derived.topic_bundles[params.topic];
  const viewModel = renderLifeArea(params.topic, bundle, context.snapshot, context.profile.birth_time_confidence);

  return NextResponse.json({
    profile: context.profile,
    default_tone_mode: context.defaultToneMode,
    bundle,
    viewModel,
  });
}
