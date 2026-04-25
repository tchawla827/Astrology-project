import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Log in" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link className="text-lg font-semibold text-primary" href="/">
            Astri
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-3 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link className="hidden hover:text-foreground sm:inline" href={item.href} key={item.href}>
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
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Astri. All rights reserved.</p>
          <nav aria-label="Legal navigation" className="flex flex-wrap gap-4">
            <Link className="hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
