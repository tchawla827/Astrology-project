"use client";

import { ErrorFallback } from "@/components/common/ErrorFallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} title="Dashboard could not load" />;
}
