import Link from "next/link";

import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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
      .select("ayanamsha")
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
  const birthProfile = birthProfileData as { ayanamsha?: "lahiri" | "raman" | "kp" } | null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase text-primary">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account and chart defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm
            ayanamsha={birthProfile?.ayanamsha ?? "lahiri"}
            defaultToneMode={profile?.default_tone_mode ?? "direct"}
            email={profile?.email ?? user.email ?? ""}
            name={profile?.name ?? ""}
            subscriptionLabel="Free plan"
          />
        </CardContent>
      </Card>
    </div>
  );
}
