import * as React from "react";

import { cn } from "@/lib/utils";

export function ToggleGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-md border border-primary/20 bg-background/70 p-1", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("min-h-10 cursor-pointer rounded-sm px-3 py-2 text-sm transition-colors hover:bg-muted", className)} {...props} />;
}
