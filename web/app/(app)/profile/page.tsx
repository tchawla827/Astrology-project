import Link from "next/link";
import { CalendarDays, MapPin, Settings, UserRound } from "lucide-react";

import { RegenerateChartButton } from "@/components/common/RegenerateChartButton";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatBirthDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(`${value}T12:00:00Z`));
  } catch {
    return value;
  }
}

function formatBirthTime(
  value: string | null | undefined,
  confidence: "exact" | "approximate" | "unknown" | undefined,
) {
  if (confidence === "unknown") {
    return "Unknown";
  }

  if (!value) {
    return "Not set";
  }

  return value.slice(0, 5);
}

function statusClass(status: "processing" | "ready" | "error") {
  if (status === "ready") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "error") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  return "border-primary/30 bg-primary/10 text-primary";
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className="text-primary hover:underline" href="/login">
            Continue to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  const [{ data: profileData, error: profileError }, { data: birthProfileData }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("email,name,default_tone_mode")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("birth_profiles")
      .select("id,name,status,birth_date,birth_time,birth_place_text,birth_time_confidence,ayanamsha,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{profileError.message}</p>
        </CardContent>
      </Card>
    );
  }

  const profile = profileData as {
    email?: string;
    name?: string | null;
    default_tone_mode?: "balanced" | "direct" | "brutal";
  } | null;
  const birthProfile = birthProfileData as {
    id: string;
    name: string;
    status: "processing" | "ready" | "error";
    birth_date: string;
    birth_time?: string | null;
    birth_place_text: string;
    birth_time_confidence: "exact" | "approximate" | "unknown";
    ayanamsha: "lahiri" | "raman" | "kp";
    created_at: string;
  } | null;

  return (
    <div className="space-y-8">
      <section className="cinematic-hero p-6 sm:p-8">
        <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 text-primary">
            <Settings className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm uppercase tracking-[0.24em]">Profile</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-glow sm:text-6xl">Settings and birth profile</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage the account defaults and the source birth profile that powers the chart rooms, life areas, daily timing, and Ask sessions.
          </p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.18em]">Source data</p>
          </div>
          <CardTitle className="mt-2 text-2xl">Saved birth profile</CardTitle>
        </CardHeader>
        <CardContent>
          {birthProfile ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{birthProfile.name}</h2>
                    <Badge className={statusClass(birthProfile.status)}>{birthProfile.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Saved {formatDateTime(birthProfile.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/welcome?new=1">Replace profile</Link>
                  </Button>
                </div>
              </div>

              <dl className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
                  <dt className="text-sm text-muted-foreground">Birth date</dt>
                  <dd className="mt-2 flex items-center gap-2 font-medium">
                    <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                    {formatBirthDate(birthProfile.birth_date)}
                  </dd>
                </div>
                <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
                  <dt className="text-sm text-muted-foreground">Birth time</dt>
                  <dd className="mt-1 font-medium">
                    {formatBirthTime(birthProfile.birth_time, birthProfile.birth_time_confidence)}
                  </dd>
                </div>
                <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
                  <dt className="text-sm text-muted-foreground">Birth-time confidence</dt>
                  <dd className="mt-1 font-medium capitalize">{birthProfile.birth_time_confidence}</dd>
                </div>
                <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
                  <dt className="text-sm text-muted-foreground">Place</dt>
                  <dd className="mt-2 flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {birthProfile.birth_place_text}
                  </dd>
                </div>
                <div className="rounded-lg border border-primary/15 bg-background/45 p-4">
                  <dt className="text-sm text-muted-foreground">Ayanamsha</dt>
                  <dd className="mt-1 font-medium capitalize">{birthProfile.ayanamsha}</dd>
                </div>
              </dl>

              <RegenerateChartButton profileId={birthProfile.id} />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">No saved birth profile is linked to this account yet.</p>
              <Button asChild>
                <Link href="/welcome">Create birth profile</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Account and chart defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm
            ayanamsha={birthProfile?.ayanamsha ?? "lahiri"}
            defaultToneMode={profile?.default_tone_mode ?? "direct"}
            email={profile?.email ?? user.email ?? ""}
            name={profile?.name ?? birthProfile?.name ?? ""}
            subscriptionLabel="Free plan"
          />
        </CardContent>
      </Card>
    </div>
  );
}
