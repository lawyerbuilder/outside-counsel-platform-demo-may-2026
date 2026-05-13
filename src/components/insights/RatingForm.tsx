"use client";

import { useActionState, useState, useEffect } from "react";
import {
  addInternalRatingAction,
  type InsightActionState,
} from "@/server/actions/insight-actions";

interface RatingFormProps {
  targetType: "FIRM" | "LAWYER";
  targetId: string;
}

const DIMENSIONS = [
  { name: "responsiveness", label: "Responsiveness" },
  { name: "quality", label: "Quality of Work" },
  { name: "commercialAwareness", label: "Commercial Awareness" },
  { name: "value", label: "Value for Money" },
  { name: "subjectMatterExpertise", label: "Subject Expertise" },
] as const;

function StarSelect({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-gray-600">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-lg transition-colors ${
              star <= value ? "text-amber-400" : "text-gray-200 hover:text-amber-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function RatingForm({ targetType, targetId }: RatingFormProps) {
  const [state, formAction, isPending] = useActionState<InsightActionState, FormData>(
    addInternalRatingAction,
    { success: false }
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setRatings({ responsiveness: 3, quality: 3, commercialAwareness: 3, value: 3, subjectMatterExpertise: 3 });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  const [ratings, setRatings] = useState({
    responsiveness: 3,
    quality: 3,
    commercialAwareness: 3,
    value: 3,
    subjectMatterExpertise: 3,
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600"
      >
        + Add Internal Rating
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">
        Rate this {targetType === "FIRM" ? "firm" : "lawyer"}
      </h4>

      <form action={formAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input
          type="hidden"
          name={targetType === "FIRM" ? "firmId" : "lawyerId"}
          value={targetId}
        />

        <div className="mb-4 space-y-2">
          {DIMENSIONS.map((dim) => (
            <StarSelect
              key={dim.name}
              name={dim.name}
              label={dim.label}
              value={ratings[dim.name]}
              onChange={(v) =>
                setRatings((prev) => ({ ...prev, [dim.name]: v }))
              }
            />
          ))}
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Comment (optional)
          </label>
          <textarea
            name="comment"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
            placeholder="Any additional thoughts..."
          />
        </div>

        {state.error && (
          <div className="mb-3 text-xs text-red-600">{state.error}</div>
        )}
        {state.success && (
          <div className="mb-3 text-xs text-green-600">Rating saved!</div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Submit Rating"}
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
