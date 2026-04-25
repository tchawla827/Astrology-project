import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { z } from "zod";

import { track } from "@/lib/analytics/events";
import { renderShareCard } from "@/lib/sharing/renderCard";
import {
  getSiteUrl,
  loadShareableMessage,
  makeShareUrl,
  mintShareToken,
  moderateShareAnswer,
  revokeShareToken,
  type PublicSharePayload,
  type SupabaseShareClient,
} from "@/lib/sharing/tokens";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

const ShareCardRequestSchema = z.object({
  ask_message_id: z.string().uuid(),
});

const RevokeRequestSchema = z.object({
  token: z.string().min(8).max(120),
});

async function renderPng(payload: PublicSharePayload, shareUrl: string) {
  const image = new ImageResponse(renderShareCard({ payload, shareUrl, width: 1080, height: 1350 }), {
    width: 1080,
    height: 1350,
  });

  return image.arrayBuffer();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ShareCardRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const shareable = await loadShareableMessage({
      supabase: supabase as unknown as SupabaseShareClient,
      messageId: parsed.data.ask_message_id,
    });

    if (!shareable) {
      return NextResponse.json({ error: "Ask message not found." }, { status: 404 });
    }

    const moderation = moderateShareAnswer(shareable.answer);
    if (!moderation.allowed) {
      return NextResponse.json(
        { error: "This answer can't be shared - try rephrasing your question." },
        { status: 422 },
      );
    }

    const token = await mintShareToken({
      supabase: supabase as unknown as SupabaseShareClient,
      askMessageId: shareable.ask_message_id,
      userId: user.id,
    });
    const origin = request.headers.get("origin");
    const siteUrl = getSiteUrl(origin);
    const shareUrl = makeShareUrl(token, siteUrl);
    const payload: PublicSharePayload = {
      ...shareable,
      token,
      created_at: new Date().toISOString(),
    };

    const png = await renderPng(payload, shareUrl);
    const storagePath = `${token}.png`;
    const { error: uploadError } = await supabase.storage
      .from("share-cards")
      .upload(storagePath, new Blob([png], { type: "image/png" }), {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("share-cards").getPublicUrl(storagePath);
    await track(supabase, "share_card_created", {}, user.id);

    return NextResponse.json({
      token,
      share_url: shareUrl,
      image_url: publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create share card." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = RevokeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await revokeShareToken({
      supabase: supabase as unknown as SupabaseShareClient,
      token: parsed.data.token,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not revoke share link." },
      { status: 500 },
    );
  }
}
