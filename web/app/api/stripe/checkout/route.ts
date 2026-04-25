import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "Paid checkout is disabled. All current features are on the free plan." }, { status: 410 });
}
