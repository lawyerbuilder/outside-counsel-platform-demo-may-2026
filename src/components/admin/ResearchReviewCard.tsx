"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  reviewUpdateAction,
  type ReviewActionState,
} from "@/server/actions/research-actions";
import { Badge } from "@/components/ui/Badge";

interface ResearchReviewCardProps {
  update: {
    id: string;
    type: string;
    title: string;
    description: string;
    source: string | null;
    confidence: number;
    targetType: string | null;
    firm: { id: string; name: string; shortName: string | null } | null;
    lawyer: { id: string; name: string } | null;
    createdAt: Date;
    batchId: string | null;
  };
}

const TYPE_LABELS: Record<string, string> = {
  RANKING_UPDATE: "Ranking Update",
  FIRM_NEWS: "Firm News",
  LAWYER_MOVE: "Lawyer Move",
  NEW_FIRM: "New Firm",
  NEW_LAWYER: "New Lawyer",
  COST_UPDATE: "Cost Update",
  GENERAL: "General",
};

const TYPE_VARIANTS: Record<string, "teal" | "amber" | "blue" | "green" | "red" | "gray" | "default"> = {
  RANKING_UPDATE: "teal",
  FIRM_NEWS: "blue",
  LAWYER_MOVE: "amber",
  NEW_FIRM: "green",
  NEW_LAWYER: "green",
  COST_UPDATE: "default",
  GENERAL: "gray",
};

export function ResearchReviewCard({ update }: ResearchReviewCardProps) {
  const [state, formAction, isPending] = useActionState<ReviewActionState, FormData>(
    reviewUpdateAction,
    { success: false }
  );

  if (state.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        Reviewed successfully.
      </div>
    );
  }

  const confidenceColor =
    update.confidence >= 0.7
      ? "text-green-600"
      : update.confidence >= 0.4
      ? "text-amber-600"
      : "text-red-500";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={TYPE_VARIANTS[update.type] ?? "gray"}>
              {TYPE_LABELS[update.type] ?? update.type}
            </Badge>
            <span className={`text-xs font-medium ${confidenceColor}`}>
              {Math.round(update.confidence * 100)}% confidence
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-gray-900">
            {update.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600">{update.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {update.firm && (
              <Link
                href={`/firms/${update.firm.id}`}
                className="text-teal-600 hover:underline"
              >
                {update.firm.shortName ?? update.firm.name}
              </Link>
            )}
            {update.lawyer && (
              <Link
                href={`/lawyers/${update.lawyer.id}`}
                className="text-teal-600 hover:underline"
              >
                {update.lawyer.name}
              </Link>
            )}
            {update.source && (
              <a
                href={update.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Source
              </a>
            )}
            <span>{new Date(update.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {state.error && (
        <div className="mt-2 text-xs text-red-600">{state.error}</div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <form action={formAction} className="inline">
          <input type="hidden" name="updateId" value={update.id} />
          <input type="hidden" name="action" value="APPROVED" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "..." : "Approve"}
          </button>
        </form>
        <form action={formAction} className="inline">
          <input type="hidden" name="updateId" value={update.id} />
          <input type="hidden" name="action" value="REJECTED" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isPending ? "..." : "Dismiss"}
          </button>
        </form>
      </div>
    </div>
  );
}
