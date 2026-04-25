import { NextResponse } from "next/server";

import { loadAskThread, type SupabaseAskUiClient } from "@/lib/server/loadAsk";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thread = await loadAskThread(supabase as unknown as SupabaseAskUiClient, user.id, params.id);
    if (!thread) {
      return NextResponse.json({ error: "Ask session not found." }, { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Ask session." },
      { status: 500 },
    );
  }
}
