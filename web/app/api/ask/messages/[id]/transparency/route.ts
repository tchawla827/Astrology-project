import { NextResponse } from "next/server";

import { loadMessageTransparency, type SupabaseTransparencyClient } from "@/lib/ask/transparency";
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
    const transparency = await loadMessageTransparency({
      supabase: supabase as unknown as SupabaseTransparencyClient,
      userId: user.id,
      messageId: params.id,
    });

    if (!transparency) {
      return NextResponse.json({ error: "Ask message not found." }, { status: 404 });
    }

    return NextResponse.json({ transparency });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load transparency details." },
      { status: 500 },
    );
  }
}
