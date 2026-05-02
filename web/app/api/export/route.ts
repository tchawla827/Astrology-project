import { NextResponse } from "next/server";
import { z } from "zod";

import { track } from "@/lib/analytics/events";
import {
  AstrologyFactsExportInputError,
  loadAstrologyFactsExportData,
  renderAstrologyFactsJson,
  type SupabaseAstrologyFactsExportClient,
} from "@/lib/server/exportAstrologyFacts";
import { loadBasicReportData, renderBasicReportPdf, type SupabaseExportClient } from "@/lib/server/exportBasicReport";
import { createClient } from "@/lib/supabase/server";

const ExportRequestSchema = z.object({
  kind: z.enum(["basic_report_pdf", "charts_transits_json"]).default("basic_report_pdf"),
  profile_id: z.string().uuid().optional(),
  date: z.string().optional(),
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
    const exportFile =
      parsed.data.kind === "charts_transits_json"
        ? await (async () => {
            const data = await loadAstrologyFactsExportData({
              supabase: supabase as unknown as SupabaseAstrologyFactsExportClient,
              userId: user.id,
              profileId: parsed.data.profile_id,
              date: parsed.data.date,
            });
            return {
              birthProfileId: data.profile.id,
              body: renderAstrologyFactsJson(data),
              contentType: "application/json",
              downloadName: `${data.profile.name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "profile"}-${data.requested_date}-facts.json`,
              storagePath: `${user.id}/${Date.now()}-${data.profile.id}-${data.requested_date}-facts.json`,
            };
          })()
        : await (async () => {
            const reportData = await loadBasicReportData({
              supabase: supabase as unknown as SupabaseExportClient,
              userId: user.id,
              profileId: parsed.data.profile_id,
            });
            return {
              birthProfileId: reportData.profile.id,
              body: renderBasicReportPdf(reportData),
              contentType: "application/pdf",
              downloadName: undefined,
              storagePath: `${user.id}/${Date.now()}-${reportData.profile.id}.pdf`,
            };
          })();

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(exportFile.storagePath, exportFile.body, { contentType: exportFile.contentType, upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: insertError } = await supabase.from("exports").insert({
      birth_profile_id: exportFile.birthProfileId,
      kind: parsed.data.kind,
      storage_path: exportFile.storagePath,
    });
    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("exports")
      .createSignedUrl(
        exportFile.storagePath,
        60 * 60 * 24 * 7,
        exportFile.downloadName ? { download: exportFile.downloadName } : undefined,
      );
    if (signedError) {
      throw new Error(signedError.message);
    }

    await track(supabase, "export_downloaded", { kind: parsed.data.kind }, user.id);
    return NextResponse.json({ url: signed.signedUrl, storage_path: exportFile.storagePath, expires_in_seconds: 60 * 60 * 24 * 7 });
  } catch (error) {
    if (error instanceof AstrologyFactsExportInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create export." },
      { status: 500 },
    );
  }
}
