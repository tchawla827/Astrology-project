import { NextResponse } from "next/server";

import { resolvePlace } from "@/lib/server/resolvePlace";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const places = await resolvePlace(query);
    return NextResponse.json({ places });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Place lookup failed." },
      { status: 502 },
    );
  }
}
