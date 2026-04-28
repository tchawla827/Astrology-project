import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <main className="cinematic-scene relative grid min-h-screen place-items-center overflow-hidden px-6 py-10">
      <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <Card className="luxury-panel relative w-full max-w-4xl overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="celestial-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-6 text-sm uppercase tracking-[0.24em] text-primary">Astri onboarding</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">Start with your birth profile.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add your birth details once. Astri computes the chart snapshot and keeps the rest of the observatory fast.
            </p>
          </div>
          <div className="rounded-lg border border-primary/15 bg-background/55 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Sequence</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>1. Choose focus</p>
              <p>2. Confirm birth-time confidence</p>
              <p>3. Generate the chart snapshot</p>
            </div>
          </div>
        </div>
        <Button asChild className="relative mt-8">
          <Link href={withReplaceMode("/intent", replaceMode)}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </Card>
    </main>
  );
}
