import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Free plan" },
  { href: "/login", label: "Log in" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="fixed left-0 right-0 top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-lg border border-primary/15 bg-background/70 px-4 py-3 shadow-bronze backdrop-blur-xl sm:px-5">
          <Link className="font-display text-2xl font-semibold text-primary" href="/">
            Astri
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-5">
            {navItems.map((item) => (
              <Link className="hidden transition-colors hover:text-foreground md:inline" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Button asChild size="sm">
              <Link href="/signup">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-primary/15 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Astri. All rights reserved.</p>
          <nav aria-label="Legal navigation" className="flex flex-wrap gap-4">
            <Link className="transition-colors hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
