"use client";

import { useActionState, useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { importTimesheetCsv, type TimesheetImportResult } from "@/server/actions/timesheet-actions";

const initialState: TimesheetImportResult = {
  success: false,
  uploadId: null,
  imported: 0,
  skipped: 0,
  errors: [],
};

export function TimesheetUploadForm({
  onUploadComplete,
}: {
  onUploadComplete?: (uploadId: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(importTimesheetCsv, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Notify parent when upload completes
  if (state.uploadId && onUploadComplete && state.imported > 0) {
    // Defer to avoid calling during render
    setTimeout(() => onUploadComplete(state.uploadId!), 0);
  }

  return (
    <div className="surface p-6">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <FileSpreadsheet size={14} className="mr-2 inline" />
        Upload Timesheet Data
      </h3>
      <p className="mb-4 text-xs text-gray-400">
        Upload MatterSphere timesheet exports (CSV) to extract intelligence about external counsel usage
      </p>

      <form ref={formRef} action={formAction}>
        <label
          htmlFor="timesheet-file"
          className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-8 transition hover:border-scg-300 hover:bg-scg-50/30"
        >
          <Upload size={24} className="mb-2 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {fileName ?? "Click to select CSV file"}
          </span>
          <span className="mt-1 text-xs text-gray-400">
            MatterSphere export format
          </span>
          <input
            id="timesheet-file"
            name="file"
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileName(f?.name ?? null);
              if (f) {
                // Auto-submit on file selection
                formRef.current?.requestSubmit();
              }
            }}
          />
        </label>

        {isPending && (
          <div className="mt-4 flex items-center gap-2 text-sm text-scg-700">
            <Loader2 size={14} className="animate-spin" />
            Parsing timesheet data…
          </div>
        )}

        {!isPending && state.imported > 0 && (
          <div className="mt-4 rounded-md border border-scg-200 bg-scg-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-scg-800">
              <CheckCircle2 size={14} />
              Imported {state.imported} entries
              {state.skipped > 0 && (
                <span className="text-scg-600">
                  ({state.skipped} skipped)
                </span>
              )}
            </div>
          </div>
        )}

        {!isPending && state.errors.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
              <AlertTriangle size={14} />
              {state.errors.length} issue{state.errors.length !== 1 ? "s" : ""}
            </div>
            <ul className="space-y-1 text-xs text-amber-700">
              {state.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {state.errors.length > 5 && (
                <li>… and {state.errors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
