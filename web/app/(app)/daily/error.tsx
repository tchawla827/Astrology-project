"use client";

import { ErrorFallback } from "@/components/common/ErrorFallback";

export default function DailyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} title="Daily predictions could not load" />;
}
