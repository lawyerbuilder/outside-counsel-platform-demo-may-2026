"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  backHref?: string;
  backLabel?: string;
}

export function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  backHref = "/directory",
  backLabel = "Go to Directory",
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mb-6 text-sm text-gray-500">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-scg-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-scg-700"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href={backHref}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {backLabel}
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-gray-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
