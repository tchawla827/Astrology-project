import Link from "next/link";
import React from "react";

import { cn } from "@/lib/utils";

export function FactorChip({
  children,
  href,
  title,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  title?: string;
  className?: string;
}) {
  const classes = cn(
    "inline-flex h-7 items-center rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground",
    "hover:border-primary/60 hover:bg-primary/10",
    className,
  );

  if (href) {
    return (
      <Link className={classes} href={href} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}
