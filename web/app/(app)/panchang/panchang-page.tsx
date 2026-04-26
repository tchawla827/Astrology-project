import Link from "next/link";

import { LocationPicker } from "@/components/panchang/LocationPicker";
import { MuhurtaTimeline } from "@/components/panchang/MuhurtaTimeline";
import { PanchangCard } from "@/components/panchang/PanchangCard";
import { PanchangDatePicker } from "@/components/panchang/PanchangDatePicker";
import { SunTimes } from "@/components/panchang/SunTimes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
import { LlmContextError } from "@/lib/llm/errors";
import { loadPanchang, type SupabasePanchangClient } from "@/lib/server/loadPanchang";
import { createClient } from "@/lib/supabase/server";

function StatusCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function parseOverride(searchParams: { lat?: string; lon?: string; tz?: string; loc?: string }) {
  const hasAny = searchParams.lat || searchParams.lon || searchParams.tz;
  if (!hasAny) {
    return undefined;
  }
  const latitude = Number(searchParams.lat);
  const longitude = Number(searchParams.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !searchParams.tz) {
    throw new LlmContextError("Location override requires valid lat, lon, and tz values.");
  }
  return {
    latitude,
    longitude,
    timezone: searchParams.tz,
    label: searchParams.loc,
  };
}

export async function PanchangPageContent({
  date,
  searchParams,
}: {
  date: string;
  searchParams: { lat?: string; lon?: string; tz?: string; loc?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <StatusCard title="Sign in required">
        <Link className="text-primary hover:underline" href="/login">
          Continue to login
        </Link>
      </StatusCard>
    );
  }

  try {
    const result = await loadPanchang({
      supabase: supabase as unknown as SupabasePanchangClient,
      userId: user.id,
      date,
      override: parseOverride(searchParams),
    });
    await track(supabase, "panchang_viewed", {}, user.id);

    return (
      <div className="space-y-6">
        <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
          <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-primary">Panchang</p>
              <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">
                {result.profile.name}&apos;s daily timing
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">Cache {result.cache}</p>
          </div>
        </section>

        {result.stale ? (
          <div className="rounded-lg border border-primary/35 bg-primary/10 p-4 text-sm text-primary">
            Showing the last cached panchang because the astrology engine is unavailable. This may be stale.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          <PanchangDatePicker date={result.panchang.date} />
          <LocationPicker date={result.panchang.date} label={result.location.label} source={result.location.source} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PanchangCard panchang={result.panchang} />
          <SunTimes sunrise={result.panchang.sunrise} sunset={result.panchang.sunset} />
        </div>

        <MuhurtaTimeline
          sunrise={result.panchang.sunrise}
          sunset={result.panchang.sunset}
          windows={result.panchang.muhurta_windows ?? []}
        />
      </div>
    );
  } catch (error) {
    const message = error instanceof LlmContextError || error instanceof Error ? error.message : "Panchang failed.";
    return (
      <StatusCard title="Panchang unavailable">
        <p className="text-sm text-muted-foreground">{message}</p>
      </StatusCard>
    );
  }
}
