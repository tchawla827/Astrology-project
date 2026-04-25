import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { renderShareCard } from "@/lib/sharing/renderCard";
import { loadPublicSharePayload, makeShareUrl, type SupabaseShareClient } from "@/lib/sharing/tokens";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  try {
    const payload = await loadPublicSharePayload({
      supabase: supabase as unknown as SupabaseShareClient,
      token: params.id,
    });

    if (!payload) {
      return NextResponse.json({ error: "Share not found." }, { status: 404 });
    }

    return new ImageResponse(
      renderShareCard({
        payload,
        shareUrl: makeShareUrl(payload.token, request.headers.get("origin")),
        width: 1200,
        height: 630,
      }),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not render share image." },
      { status: 500 },
    );
  }
}
