import { redirect } from "next/navigation";

import { isReplaceMode, resolveSignedInPath, type SupabaseAccountRoutingClient } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

import { BirthDetailsForm } from "./BirthDetailsForm";

export default async function BirthDetailsPage({
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

  return <BirthDetailsForm />;
}
