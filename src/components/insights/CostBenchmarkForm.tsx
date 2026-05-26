"use client";

import { useActionState, useState, useEffect } from "react";
import {
  addCostBenchmarkAction,
  type InsightActionState,
} from "@/server/actions/insight-actions";
import {
  BENCHMARK_ROLE_LABELS,
  BENCHMARK_SOURCE_LABELS,
  type BenchmarkRoleEnum,
  type BenchmarkSourceEnum,
} from "@/lib/schemas";

interface CostBenchmarkFormProps {
  firmId: string;
  practiceAreas: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
}

export function CostBenchmarkForm({
  firmId,
  practiceAreas,
  jurisdictions,
}: CostBenchmarkFormProps) {
  const [state, formAction, isPending] = useActionState<InsightActionState, FormData>(
    addCostBenchmarkAction,
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
        + Add Cost Benchmark
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">
        Add Cost Benchmark
      </h4>

      <form action={formAction}>
        <input type="hidden" name="firmId" value={firmId} />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Role *
            </label>
            <select
              name="role"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              {(Object.keys(BENCHMARK_ROLE_LABELS) as BenchmarkRoleEnum[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {BENCHMARK_ROLE_LABELS[key]}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Source *
            </label>
            <select
              name="source"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              {(
                Object.keys(BENCHMARK_SOURCE_LABELS) as BenchmarkSourceEnum[]
              ).map((key) => (
                <option key={key} value={key}>
                  {BENCHMARK_SOURCE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Practice Area *
            </label>
            <select
              name="practiceAreaId"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              <option value="">Select...</option>
              {practiceAreas.map((pa) => (
                <option key={pa.id} value={pa.id}>
                  {pa.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Jurisdiction *
            </label>
            <select
              name="jurisdictionId"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            >
              <option value="">Select...</option>
              {jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Hourly Rate (USD) *
            </label>
            <input
              type="number"
              name="hourlyRateUsd"
              required
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
              placeholder="cents"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Blended Rate
            </label>
            <input
              type="number"
              name="blendedRateUsd"
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
              placeholder="cents"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Fixed Fee
            </label>
            <input
              type="number"
              name="fixedFeeUsd"
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
              placeholder="cents"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Year *
          </label>
          <input
            type="number"
            name="year"
            required
            min="2000"
            max={new Date().getFullYear() + 1}
            defaultValue={new Date().getFullYear()}
            className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
          />
        </div>

        {state.error && (
          <div className="mb-3 text-xs text-red-600">{state.error}</div>
        )}
        {state.success && (
          <div className="mb-3 text-xs text-green-600">
            Cost benchmark saved!
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-scg-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Benchmark"}
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
