import { redirect } from "next/navigation";

import { isReplaceMode, resolveSignedInPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

import { ConfidenceClient } from "./ConfidenceClient";

export default async function ConfidencePage({
  searchParams,
}: {
  searchParams?: { new?: string | string[] };
}) {
  const replaceMode = isReplaceMode(searchParams?.new);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !replaceMode) {
    const destination = await resolveSignedInPath(
      supabase as unknown as SupabaseAccountRoutingClient,
      user.id,
    );
    if (destination !== "/welcome") {
      redirect(destination);
    }
  }

  return <ConfidenceClient replaceMode={replaceMode} />;
}
