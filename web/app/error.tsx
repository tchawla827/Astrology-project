"use client";

import { ErrorFallback } from "@/components/common/ErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} title="Astri hit an unexpected error" />;
}
