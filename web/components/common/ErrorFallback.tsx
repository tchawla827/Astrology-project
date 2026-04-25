"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/observability/logging";

export function ErrorFallback({
  error,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
}) {
  useEffect(() => {
    captureException(error, { component: "error-boundary", digest: error.digest ?? null, title });
  }, [error, title]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-lg border bg-card p-6">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Something failed while loading this view. The error has been logged, and you can retry without leaving the page.
        </p>
      </div>
      <Button className="gap-2" onClick={reset} type="button">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
