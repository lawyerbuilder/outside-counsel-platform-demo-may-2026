"use client";

import { useActionState, useState, useEffect } from "react";
import {
  addRecommendationAction,
  type InsightActionState,
} from "@/server/actions/insight-actions";

interface NpsFormProps {
  targetType: "FIRM" | "LAWYER";
  targetId: string;
  practiceAreas: { id: string; name: string }[];
}

const NPS_LABELS: Record<number, string> = {
  0: "Not at all likely",
  5: "Neutral",
  10: "Extremely likely",
};

export function NpsForm({ targetType, targetId, practiceAreas }: NpsFormProps) {
  const [state, formAction, isPending] = useActionState<InsightActionState, FormData>(
    addRecommendationAction,
    { success: false }
  );
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setSelectedScore(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600"
      >
        + Add NPS Recommendation
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/30 p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">
        Would you recommend this {targetType === "FIRM" ? "firm" : "lawyer"}?
      </h4>

      <form action={formAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input
          type="hidden"
          name={targetType === "FIRM" ? "firmId" : "lawyerId"}
          value={targetId}
        />

        {/* NPS Scale */}
        <div className="mb-4">
          <div className="flex justify-between gap-1">
            {Array.from({ length: 11 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedScore(i)}
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  selectedScore === i
                    ? i >= 9
                      ? "bg-green-600 text-white"
                      : i >= 7
                      ? "bg-amber-500 text-white"
                      : "bg-red-500 text-white"
                    : "border border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>{NPS_LABELS[0]}</span>
            <span>{NPS_LABELS[5]}</span>
            <span>{NPS_LABELS[10]}</span>
          </div>
          <input type="hidden" name="npsScore" value={selectedScore ?? ""} />
        </div>

        {/* Practice area (optional) */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            For what type of work? (optional)
          </label>
          <select
            name="practiceAreaId"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="">Any</option>
            {practiceAreas.map((pa) => (
              <option key={pa.id} value={pa.id}>
                {pa.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reason (optional) */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Why? (optional)
          </label>
          <textarea
            name="reason"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
            placeholder="Share your experience..."
          />
        </div>

        {state.error && (
          <div className="mb-3 text-xs text-red-600">{state.error}</div>
        )}
        {state.success && (
          <div className="mb-3 text-xs text-green-600">
            Recommendation saved!
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending || selectedScore === null}
            className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
