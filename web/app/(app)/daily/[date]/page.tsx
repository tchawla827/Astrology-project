import Link from "next/link";

import { DailyCard } from "@/components/daily/DailyCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { track } from "@/lib/analytics/events";
import { LlmContextError, LlmProviderError } from "@/lib/llm/errors";
import { checkDailyQuota, type SupabaseDailyQuotaClient } from "@/lib/quotas/dailyQuota";
import { generateDailyPrediction, resolveDailyDate, type SupabaseDailyClient } from "@/lib/server/generateDailyPrediction";
import { createClient } from "@/lib/supabase/server";
import { ToneModeSchema } from "@/lib/schemas";

function plusYears(date: string, years: number) {
  const [year, month, day] = date.split("-").map(Number);
  return `${String((year ?? 0) + years).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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

export default async function DailyDatePage({
  params,
  searchParams,
}: {
  params: { date: string };
  searchParams: { tone?: string };
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

  const parsedTone = ToneModeSchema.safeParse(searchParams.tone ?? "direct");
  if (!parsedTone.success) {
    return (
      <StatusCard title="Daily prediction unavailable">
        <p className="text-sm text-muted-foreground">Tone must be balanced, direct, or brutal.</p>
      </StatusCard>
    );
  }

  const { data: profileData, error: profileError } = await supabase
    .from("birth_profiles")
    .select("id,status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) {
    return (
      <StatusCard title="Daily prediction unavailable">
        <p className="text-sm text-muted-foreground">{profileError.message}</p>
      </StatusCard>
    );
  }

  const profile = profileData as { id?: string; status?: string } | null;
  if (!profile?.id) {
    return (
      <StatusCard title="Create your first profile">
        <Link className="text-primary hover:underline" href="/welcome">
          Start onboarding
        </Link>
      </StatusCard>
    );
  }

  if (profile.status === "processing" || profile.status === "error") {
    return (
      <StatusCard title="Daily prediction unavailable">
        <p className="text-sm text-muted-foreground">
          {profile.status === "processing"
            ? "Profile generation is still running. Return after the chart snapshot is ready."
            : "Profile generation failed. Regenerate the chart snapshot to retry."}
        </p>
      </StatusCard>
    );
  }

  const quota = await checkDailyQuota({
    supabase: supabase as unknown as SupabaseDailyQuotaClient,
    userId: user.id,
    date: params.date,
  });

  try {
    const result = await generateDailyPrediction({
      supabase: supabase as unknown as SupabaseDailyClient,
      profile_id: profile.id,
      date: params.date,
      tone: parsedTone.data,
    });
    const angularHouses = new Set([1, 4, 7, 10]);
    const showBirthTimeSensitivity =
      result.context.birth_time_confidence !== "exact" &&
      result.prediction.technical_basis.triggered_houses.some((house) => angularHouses.has(house));
    const cacheLabel = `Prediction ${result.cache.prediction}; transits ${result.cache.transits}`;
    const todayDate = resolveDailyDate("today", result.profile.timezone);
    await track(
      supabase,
      "daily_viewed",
      { date_offset_days: quota.date_offset_days ?? null, tone: parsedTone.data },
      user.id,
    );

    return (
      <div className="space-y-6">
        <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
          <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Timeline and predictions</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">
              {result.profile.name}&apos;s date machine
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
              Move through favorable periods, caution windows, natal overlays, and transit triggers for a selected date.
            </p>
          </div>
        </section>
        <DailyCard
          cacheLabel={cacheLabel}
          maxDate={plusYears(result.profile.birth_date, 120)}
          minDate={result.profile.birth_date}
          prediction={result.prediction}
          showBirthTimeSensitivity={showBirthTimeSensitivity}
          todayDate={todayDate}
          tone={parsedTone.data}
          transitRules={result.context.transit_rules}
          transits={result.transits}
        />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof LlmProviderError
        ? "Daily predictions are temporarily unavailable because all LLM providers failed."
        : error instanceof LlmContextError || error instanceof Error
          ? error.message
          : "Daily prediction failed.";

    return (
      <StatusCard title="Daily prediction unavailable">
        <p className="text-sm text-muted-foreground">{message}</p>
      </StatusCard>
    );
  }
}
