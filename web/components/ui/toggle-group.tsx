import * as React from "react";

import { cn } from "@/lib/utils";

export function ToggleGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-md border", className)} {...props} />;
}

export function ToggleGroupItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("px-3 py-2 text-sm hover:bg-muted", className)} {...props} />;
}
