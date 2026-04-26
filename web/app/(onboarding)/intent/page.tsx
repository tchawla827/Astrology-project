import { redirect } from "next/navigation";

import { isReplaceMode, resolveSignedInPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

import { IntentClient } from "./IntentClient";

export default async function IntentPage({
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

  return <IntentClient replaceMode={replaceMode} />;
}
