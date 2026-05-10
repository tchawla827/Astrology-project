"use client";

import { LoaderCircle } from "lucide-react";
import React, { useEffect, useState } from "react";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function loadingLabelFor(href: string) {
  const target = new URL(href, window.location.origin);
  if (target.origin !== window.location.origin || target.pathname !== "/timeline") {
    return null;
  }

  const area = target.searchParams.get("area") ?? "career";
  const year = target.searchParams.get("year") ?? String(new Date().getFullYear());
  const month = Number(target.searchParams.get("month"));
  const monthLabel = Number.isInteger(month) && month >= 1 && month <= 12 ? monthLabels[month - 1] : null;
  const dateLabel = monthLabel ? `${monthLabel} ${year}` : year;

  return `Calculating ${titleCase(area)} timing for ${dateLabel}...`;
}

export function TimelinePendingShell({
  children,
  routeKey,
}: {
  children: React.ReactNode;
  routeKey: string;
}) {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    setPendingLabel(null);
  }, [routeKey]);

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target || anchor.getAttribute("download") !== null) {
      return;
    }

    const label = loadingLabelFor(anchor.href);
    if (!label) {
      return;
    }

    const target = new URL(anchor.href);
    const current = `${window.location.pathname}${window.location.search}`;
    const next = `${target.pathname}${target.search}`;
    if (current === next) {
      return;
    }

    setPendingLabel(label);
  }

  const isPending = pendingLabel !== null;

  return (
    <div aria-busy={isPending} className="relative space-y-8" onClickCapture={handleClickCapture}>
      {children}
      {isPending ? (
        <div
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/78 px-6 backdrop-blur-sm"
          role="status"
        >
          <div className="cosmic-surface relative w-full max-w-xl overflow-hidden rounded-lg border border-primary/25 p-6 shadow-bronze">
            <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Working</p>
                <p className="mt-3 font-display text-3xl font-semibold leading-tight text-glow">Loading timing graph</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{pendingLabel}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
