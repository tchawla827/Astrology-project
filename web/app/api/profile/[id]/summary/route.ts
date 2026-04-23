import { NextResponse, type NextRequest } from "next/server";

import { loadDashboard, type SupabaseDashboardClient } from "@/lib/server/loadDashboard";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await loadDashboard(supabase as unknown as SupabaseDashboardClient, user.id, params.id);
  if (dashboard.status === "empty") {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ dashboard });
}
