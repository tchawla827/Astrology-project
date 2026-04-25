import { NextResponse } from "next/server";
import { z } from "zod";

import { track } from "@/lib/analytics/events";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const DeleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

async function removeStorageArtifacts(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data: exportsData } = await service
    .from("exports")
    .select("storage_path,birth_profiles!inner(user_id)")
    .eq("birth_profiles.user_id", userId);
  const exportPaths = (exportsData as Array<{ storage_path?: string }> | null)
    ?.map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path)) ?? [];

  const { data: listedExports } = await service.storage.from("exports").list(userId, { limit: 1000 });
  const listedExportPaths = listedExports?.map((item) => `${userId}/${item.name}`) ?? [];
  const allExportPaths = [...new Set([...exportPaths, ...listedExportPaths])];
  if (allExportPaths.length > 0) {
    await service.storage.from("exports").remove(allExportPaths);
  }

  const { data: tokenData } = await service.from("share_tokens").select("token").eq("created_by", userId);
  const shareCardPaths = (tokenData as Array<{ token?: string }> | null)
    ?.map((row) => (row.token ? `${row.token}.png` : null))
    .filter((path): path is string => Boolean(path)) ?? [];
  if (shareCardPaths.length > 0) {
    await service.storage.from("share-cards").remove(shareCardPaths);
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = DeleteAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type "DELETE" to confirm account deletion.' }, { status: 400 });
  }

  const service = createServiceClient();
  try {
    await removeStorageArtifacts(service, user.id);
    await track(service, "account_deleted", {}, user.id);
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete account." },
      { status: 500 },
    );
  }
}
