import { NextResponse, type NextRequest } from "next/server";

import { DerivedFeaturePayloadSchema, DerivedFeatureSnapshotSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

type DerivedSnapshotRow = {
  id: string;
  birth_profile_id: string;
  chart_snapshot_id: string;
  schema_version: string;
  computed_at: string;
  payload: unknown;
};

function asDerivedSnapshotRow(value: unknown): DerivedSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Partial<DerivedSnapshotRow>;
  if (
    typeof row.id !== "string" ||
    typeof row.birth_profile_id !== "string" ||
    typeof row.chart_snapshot_id !== "string" ||
    typeof row.schema_version !== "string" ||
    typeof row.computed_at !== "string" ||
    !("payload" in row)
  ) {
    return null;
  }

  return row as DerivedSnapshotRow;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
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

  const { data, error } = await supabase
    .from("derived_feature_snapshots")
    .select("id,birth_profile_id,chart_snapshot_id,schema_version,computed_at,payload")
    .eq("birth_profile_id", params.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = asDerivedSnapshotRow(data);
  if (!row) {
    return NextResponse.json({ error: "Derived snapshot not found." }, { status: 404 });
  }

  const parsedPayload = DerivedFeaturePayloadSchema.safeParse(row.payload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "The stored derived snapshot does not match the expected schema." }, { status: 500 });
  }

  const derived = DerivedFeatureSnapshotSchema.parse({
    id: row.id,
    birth_profile_id: row.birth_profile_id,
    chart_snapshot_id: row.chart_snapshot_id,
    schema_version: row.schema_version,
    computed_at: row.computed_at,
    ...parsedPayload.data,
  });

  return NextResponse.json({ derived });
}
