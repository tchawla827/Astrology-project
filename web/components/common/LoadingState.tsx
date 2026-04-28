import { LoaderCircle } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InlineLoading({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      aria-live="polite"
      className={cn("flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary", className)}
      role="status"
    >
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function RouteLoadingState({
  title = "Loading workspace",
  description = "Preparing your view...",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="space-y-6" aria-live="polite" role="status">
      <section className="cosmic-surface relative overflow-hidden rounded-lg border border-primary/20 p-6 shadow-bronze sm:p-8">
        <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-primary">Working</p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-glow">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {["primary", "secondary", "supporting"].map((key) => (
          <Card key={key}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
