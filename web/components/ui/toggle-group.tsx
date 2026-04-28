import * as React from "react";

import { cn } from "@/lib/utils";

export function ToggleGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-md border border-primary/20 bg-background/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("min-h-10 cursor-pointer rounded-sm px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
