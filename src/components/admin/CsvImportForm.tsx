"use client";

import { useActionState } from "react";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import {
  importFirmRankingsCsv,
  type ImportResult,
} from "@/server/actions/import-actions";

const initialState: ImportResult = {
  success: false,
  imported: 0,
  skipped: 0,
  errors: [],
};

export function CsvImportForm() {
  const [state, formAction, isPending] = useActionState<ImportResult, FormData>(
    importFirmRankingsCsv,
    initialState
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        Import Firm Rankings from CSV
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        Required columns: firm_name, publisher, edition_year, practice_area,
        jurisdiction. Optional: band, tier, star_rating.
      </p>

      <form action={formAction}>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={14} />
            Choose CSV File
            <input
              type="file"
              name="file"
              accept=".csv"
              className="hidden"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-scg-600 px-4 py-2 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
          >
            {isPending ? "Importing..." : "Import"}
          </button>
        </div>
      </form>

      {(state.imported > 0 || state.skipped > 0) && (
        <div className="mt-4 space-y-2">
          {state.imported > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle size={14} />
              {state.imported} ranking{state.imported !== 1 ? "s" : ""} imported
              successfully
            </div>
          )}
          {state.skipped > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle size={14} />
              {state.skipped} row{state.skipped !== 1 ? "s" : ""} skipped
            </div>
          )}
          {state.errors.length > 0 && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="mb-1 text-xs font-medium text-red-700">Errors:</p>
              <ul className="space-y-0.5 text-xs text-red-600">
                {state.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
