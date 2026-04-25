import { NextResponse } from "next/server";
import { z } from "zod";

import { track } from "@/lib/analytics/events";
import { loadBasicReportData, renderBasicReportPdf, type SupabaseExportClient } from "@/lib/server/exportBasicReport";
import { createClient } from "@/lib/supabase/server";

const ExportRequestSchema = z.object({
  kind: z.literal("basic_report_pdf").default("basic_report_pdf"),
  profile_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ExportRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const reportData = await loadBasicReportData({
      supabase: supabase as unknown as SupabaseExportClient,
      userId: user.id,
      profileId: parsed.data.profile_id,
    });

    const pdf = renderBasicReportPdf(reportData);
    const storagePath = `${user.id}/${Date.now()}-${reportData.profile.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: insertError } = await supabase.from("exports").insert({
      birth_profile_id: reportData.profile.id,
      kind: parsed.data.kind,
      storage_path: storagePath,
    });
    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("exports")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (signedError) {
      throw new Error(signedError.message);
    }

    await track(supabase, "export_downloaded", { kind: parsed.data.kind }, user.id);
    return NextResponse.json({ url: signed.signedUrl, storage_path: storagePath, expires_in_seconds: 60 * 60 * 24 * 7 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create export." },
      { status: 500 },
    );
  }
}
