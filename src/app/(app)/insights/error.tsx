"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";

export default function InsightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Insights error"
      backHref="/insights"
      backLabel="Back to Insights"
    />
  );
}
