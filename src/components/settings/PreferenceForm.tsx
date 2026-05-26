"use client";

import { useActionState } from "react";
import {
  updatePreferencesAction,
  type PreferenceActionState,
} from "@/server/actions/preference-actions";
import {
  PREFERENCE_LABELS,
  PREFERENCE_DESCRIPTIONS,
  type UpdatePreferenceInput,
} from "@/lib/schemas";

interface PreferenceFormProps {
  userId: string;
  currentWeights: UpdatePreferenceInput;
}

const WEIGHT_KEYS = [
  "weightResponsiveness",
  "weightQuality",
  "weightCommercialAwareness",
  "weightValue",
  "weightSubjectMatterExpertise",
  "weightNps",
] as const;

function weightLabel(val: number): string {
  if (val <= 0.2) return "Not important";
  if (val <= 0.6) return "Less important";
  if (val <= 1.0) return "Standard";
  if (val <= 1.4) return "Important";
  return "Very important";
}

function weightColor(val: number): string {
  if (val <= 0.6) return "text-gray-400";
  if (val <= 1.0) return "text-gray-600";
  if (val <= 1.4) return "text-scg-600";
  return "text-scg-700 font-semibold";
}

export function PreferenceForm({ userId, currentWeights }: PreferenceFormProps) {
  const [state, formAction, isPending] = useActionState<PreferenceActionState, FormData>(
    updatePreferencesAction,
    { success: false }
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />

      <div className="space-y-6">
        {WEIGHT_KEYS.map((key) => (
          <div key={key} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor={key}
                  className="text-sm font-medium text-gray-900"
                >
                  {PREFERENCE_LABELS[key]}
                </label>
                <p className="text-xs text-gray-500">
                  {PREFERENCE_DESCRIPTIONS[key]}
                </p>
              </div>
              <span
                className={`text-xs font-medium ${weightColor(currentWeights[key])}`}
              >
                {weightLabel(currentWeights[key])}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-gray-400">0</span>
              <input
                type="range"
                id={key}
                name={key}
                min="0"
                max="2"
                step="0.1"
                defaultValue={currentWeights[key]}
                className="flex-1 accent-scg-600"
              />
              <span className="text-xs text-gray-400">2</span>
            </div>
          </div>
        ))}
      </div>

      {state.error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Preferences saved! Directory results will update on next visit.
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-scg-600 px-6 py-2 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </form>
  );
}
