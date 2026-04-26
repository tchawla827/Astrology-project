import Link from "next/link";
import { redirect } from "next/navigation";

import { isReplaceMode, resolveSignedInPath, type SupabaseAccountRoutingClient, withReplaceMode } from "@/lib/accountRouting";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage({
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

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-widest text-primary">Astri onboarding</p>
      <h1 className="mt-3 text-4xl font-semibold">Start with your birth profile.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Add your birth details once. Astri computes the chart snapshot and keeps later pages fast.
      </p>
      <Link
        className="mt-8 inline-flex h-10 w-fit items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        href={withReplaceMode("/intent", replaceMode)}
      >
        Continue
      </Link>
    </main>
  );
}
