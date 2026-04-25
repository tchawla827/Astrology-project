import { NextResponse, type NextRequest } from "next/server";

import { isSupportedChartKey } from "@/lib/charts/catalog";
import { ChartSnapshotSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: { id: string; key: string } }) {
  if (!isSupportedChartKey(params.key)) {
    return NextResponse.json({ error: "Unsupported chart key." }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("birth_profiles")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from("chart_snapshots")
    .select("id,engine_version,computed_at,payload")
    .eq("birth_profile_id", params.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError) {
    return NextResponse.json({ error: snapshotError.message }, { status: 500 });
  }

  if (!snapshotRow || typeof snapshotRow !== "object" || !("payload" in snapshotRow)) {
    return NextResponse.json({ error: "Chart snapshot not found." }, { status: 404 });
  }

  const parsed = ChartSnapshotSchema.safeParse((snapshotRow as { payload: unknown }).payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "The stored chart snapshot does not match the expected schema." }, { status: 500 });
  }

  const chart = parsed.data.charts[params.key];
  if (!chart) {
    return NextResponse.json({ error: "Chart not found in snapshot." }, { status: 404 });
  }

  return NextResponse.json({
    chart,
    snapshot_meta: {
      id: (snapshotRow as { id?: string }).id,
      engine_version: (snapshotRow as { engine_version?: string }).engine_version,
      computed_at: (snapshotRow as { computed_at?: string }).computed_at,
    },
  });
}
