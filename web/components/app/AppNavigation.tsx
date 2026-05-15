"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  HeartHandshake,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  Menu,
  MessageSquareText,
  SunMedium,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  summary: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  summary: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Start",
    summary: "The daily command center",
    items: [
      {
        href: "/dashboard",
        label: "Observatory",
        summary: "Current chart state and next actions",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Interpret",
    summary: "Understand the chart",
    items: [
      { href: "/charts", label: "Charts", summary: "D1, divisional charts, and compare", icon: BarChart3 },
      { href: "/life-areas", label: "Life Areas", summary: "Focused reports by topic", icon: HeartPulse },
      { href: "/timeline", label: "Timing Graph", summary: "Year and month signal strength", icon: LineChart },
    ],
  },
  {
    label: "Act",
    summary: "Ask, time, and relate",
    items: [
      { href: "/ask", label: "Ask AI", summary: "Private chart advisory", icon: MessageSquareText },
      { href: "/daily", label: "Daily", summary: "Prediction for a selected date", icon: CalendarDays },
      { href: "/panchang", label: "Panchang", summary: "Muhurta, tithi, and local timing", icon: SunMedium },
      { href: "/relationships", label: "Relationships", summary: "Shared compatibility workspaces", icon: HeartHandshake },
    ],
  },
  {
    label: "Manage",
    summary: "Source data and defaults",
    items: [{ href: "/profile", label: "Profile", summary: "Birth data, tone, and account", icon: UserRound }],
  },
];

const allItems = navGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
const fallbackItem = allItems[0]!;

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  if (href === "/daily") {
    return pathname === "/daily" || pathname.startsWith("/daily/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentItem(pathname: string) {
  return allItems.find((item) => isActivePath(pathname, item.href)) ?? fallbackItem;
}

function NavigationLink({
  item,
  pathname,
  compact = false,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-12 items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/45 bg-primary/15 text-foreground"
          : "border-transparent text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-foreground",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
          active
            ? "border-primary/50 bg-primary text-primary-foreground"
            : "border-primary/15 bg-background/55 text-primary group-hover:border-primary/35",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium leading-5">{item.label}</span>
        {!compact ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.summary}</span> : null}
      </span>
      {active ? <span className="ml-auto h-8 w-1 rounded-full bg-primary" aria-hidden="true" /> : null}
    </Link>
  );
}

function NavigationGroups({
  pathname,
  compact = false,
  onNavigate,
}: {
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary app navigation" className="space-y-6">
      {navGroups.map((group) => (
        <section className="space-y-2" key={group.label}>
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{group.label}</p>
            {!compact ? <p className="mt-1 text-xs text-muted-foreground">{group.summary}</p> : null}
          </div>
          <div className="grid gap-1.5">
            {group.items.map((item) => (
              <NavigationLink
                compact={compact}
                item={item}
                key={item.href}
                onNavigate={onNavigate}
                pathname={pathname}
              />
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AppNavigation({ isSignedIn, userEmail }: { isSignedIn: boolean; userEmail?: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = currentItem(pathname);
  const ActiveIcon = activeItem.icon;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 flex-col border-r border-primary/15 bg-background/80 p-5 shadow-bronze backdrop-blur-xl lg:flex">
        <div>
          <BrandLogo href="/dashboard" markClassName="h-11 w-11" textClassName="text-4xl" />
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">Guided chart workspace</p>
        </div>

        <div className="mt-6 rounded-lg border border-primary/20 bg-card/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">You are here</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ActiveIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">{activeItem.label}</p>
              <p className="text-xs text-muted-foreground">{activeItem.summary}</p>
            </div>
          </div>
        </div>

        <div className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1">
          <NavigationGroups pathname={pathname} />
        </div>

        <div className="mt-5 space-y-4 border-t border-primary/15 pt-5">
          <div className="rounded-lg border border-primary/15 bg-background/55 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary">Current access</p>
            <p className="mt-2 text-sm font-medium">Free plan</p>
            {userEmail ? <p className="mt-1 break-words text-xs text-muted-foreground">{userEmail}</p> : null}
          </div>
          {isSignedIn ? <LogoutButton /> : null}
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-primary/15 bg-background/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <BrandLogo href="/dashboard" markClassName="h-9 w-9" textClassName="text-3xl" />
          <button
            aria-controls="mobile-app-navigation"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-primary/25 bg-card/70 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileOpen((open) => !open)}
            type="button"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        <div className="border-t border-primary/10 px-4 pb-3">
          <div className="flex items-center gap-3 rounded-lg bg-card/55 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ActiveIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{activeItem.label}</p>
              <p className="truncate text-xs text-muted-foreground">{activeItem.summary}</p>
            </div>
          </div>
        </div>

        {mobileOpen ? (
          <div id="mobile-app-navigation" className="max-h-[calc(100vh-8rem)] overflow-y-auto border-t border-primary/15 px-4 py-4">
            <NavigationGroups compact onNavigate={() => setMobileOpen(false)} pathname={pathname} />
            <div className="mt-5 border-t border-primary/15 pt-5">
              {isSignedIn ? <LogoutButton /> : null}
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
