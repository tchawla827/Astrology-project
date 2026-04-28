import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-primary/20 bg-background/55 px-2.5 py-0.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
      {...props}
    />
  );
}
