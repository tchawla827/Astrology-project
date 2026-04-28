import Link from "next/link";
import { BarChart3, CalendarDays, HeartPulse, LayoutDashboard, MessageSquareText, Sparkles, SunMedium, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/dashboard", label: "Observatory", icon: LayoutDashboard },
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/life-areas", label: "Life Areas", icon: HeartPulse },
  { href: "/ask", label: "Ask AI", icon: MessageSquareText },
  { href: "/daily", label: "Timeline", icon: CalendarDays },
  { href: "/panchang", label: "Panchang", icon: SunMedium },
  { href: "/profile", label: "Profile", icon: UserRound },
];

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

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-primary/20 bg-background/75 p-5 shadow-bronze backdrop-blur-xl lg:flex">
        <Link className="font-display text-4xl font-semibold text-primary text-glow" href="/dashboard">
          Astri
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">Private observatory</p>

        <nav aria-label="Primary app navigation" className="mt-9 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="group flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4 text-primary/80 transition-colors group-hover:text-primary" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="ritual-panel rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.18em]">Current access</p>
            </div>
            <p className="mt-3 text-sm font-medium">{user ? "Free plan" : "Signed out"}</p>
            {user?.email ? <p className="mt-1 break-words text-xs text-muted-foreground">{user.email}</p> : null}
          </div>
          {user ? <LogoutButton /> : null}
        </div>
      </aside>

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-primary/20 bg-background/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <Link className="font-display text-3xl font-semibold text-primary text-glow" href="/dashboard">
              Astri
            </Link>
            {user ? <LogoutButton /> : null}
          </div>
          <nav aria-label="Mobile app navigation" className="flex gap-2 overflow-x-auto px-4 pb-4 text-sm text-muted-foreground">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-primary/20 bg-background/60 px-3 transition-colors hover:bg-primary/10 hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
