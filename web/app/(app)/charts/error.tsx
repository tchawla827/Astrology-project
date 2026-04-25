"use client";

import { ErrorFallback } from "@/components/common/ErrorFallback";

export default function ChartsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} title="Charts could not load" />;
}
