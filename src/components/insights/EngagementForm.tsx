"use client";

import { useActionState, useState, useEffect } from "react";
import {
  addEngagementAction,
  type InsightActionState,
} from "@/server/actions/insight-actions";
import {
  MATTER_TYPE_LABELS,
  OUTCOME_LABELS,
  type MatterTypeEnum,
  type EngagementOutcomeEnum,
} from "@/lib/schemas";

interface EngagementFormProps {
  firmId: string;
  lawyers: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
}

export function EngagementForm({
  firmId,
  lawyers,
  jurisdictions,
}: EngagementFormProps) {
  const [state, formAction, isPending] = useActionState<InsightActionState, FormData>(
    addEngagementAction,
    { success: false }
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => setIsOpen(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-scg-400 hover:text-scg-600"
      >
        + Log Engagement
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">
        Log an Engagement
      </h4>

      <form action={formAction}>
        <input type="hidden" name="firmId" value={firmId} />

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Matter Name *
          </label>
          <input
            type="text"
            name="matterName"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            placeholder="e.g. SCG Chemicals JV Dispute"
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Matter Type *
            </label>
            <select
              name="matterType"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              {(Object.keys(MATTER_TYPE_LABELS) as MatterTypeEnum[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {MATTER_TYPE_LABELS[key]}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Outcome
            </label>
            <select
              name="outcome"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              {(Object.keys(OUTCOME_LABELS) as EngagementOutcomeEnum[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {OUTCOME_LABELS[key]}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            />
          </div>
        </div>

        {lawyers.length > 0 && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Lead Lawyer (optional)
            </label>
            <select
              name="lawyerId"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              <option value="">None</option>
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {jurisdictions.length > 0 && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Jurisdiction (optional)
            </label>
            <select
              name="jurisdictionId"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              <option value="">Any</option>
              {jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              SCG Entity (optional)
            </label>
            <input
              type="text"
              name="entityName"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
              placeholder="e.g. SCG Chemicals"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Total Fees (USD cents)
            </label>
            <input
              type="number"
              name="totalFeesUsd"
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
              placeholder="e.g. 5000000"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            placeholder="Any additional context..."
          />
        </div>

        {state.error && (
          <div className="mb-3 text-xs text-red-600">{state.error}</div>
        )}
        {state.success && (
          <div className="mb-3 text-xs text-green-600">
            Engagement logged!
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-scg-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Log Engagement"}
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
