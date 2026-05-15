import { AppNavigation } from "@/components/app/AppNavigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="cinematic-scene pointer-events-none fixed inset-0 opacity-45" aria-hidden="true" />
      <div className="cosmic-veil pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="star-noise pointer-events-none fixed inset-0 opacity-35" aria-hidden="true" />

      <AppNavigation isSignedIn={Boolean(user)} userEmail={user?.email} />

      <div className="relative z-10 lg:pl-80">
        <main className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
