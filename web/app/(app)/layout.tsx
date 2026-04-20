import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/charts", label: "Charts" },
  { href: "/life-areas/personality", label: "Life Areas" },
  { href: "/ask", label: "Ask" },
  { href: "/daily", label: "Daily" },
  { href: "/panchang", label: "Panchang" },
  { href: "/profile", label: "Profile" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="text-lg font-semibold text-primary" href="/dashboard">
            Astri
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link className="hover:text-foreground" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="text-xs text-muted-foreground">{user?.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
