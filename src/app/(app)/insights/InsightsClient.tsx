"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { TimesheetUploadForm } from "@/components/insights/TimesheetUploadForm";
import { AnalyzeTrigger } from "@/components/insights/TimesheetAnalysisPanel";
import type { TimesheetAnalysis } from "@/server/timesheet";

type UploadSummary = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  processedRows: number;
  entryCount: number;
  uploadedBy: string;
  createdAt: string;
  errorMessage: string | null;
};

export function InsightsClient({
  uploads,
  latestAnalysis,
  latestAnalyzedUploadId,
}: {
  uploads: UploadSummary[];
  latestAnalysis: TimesheetAnalysis | null;
  latestAnalyzedUploadId: string | null;
}) {
  const router = useRouter();
  const [activeUploadId, setActiveUploadId] = useState<string | null>(
    latestAnalyzedUploadId
  );

  // Find the active upload to show analysis for
  const activeUpload = uploads.find((u) => u.id === activeUploadId);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column: Upload + History */}
      <div className="space-y-6">
        <TimesheetUploadForm
          onUploadComplete={(uploadId) => {
            setActiveUploadId(uploadId);
            router.refresh();
          }}
        />

        {/* Upload History */}
        {uploads.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Clock size={14} className="mr-2 inline" />
              Upload History
            </h3>
            <div className="space-y-2">
              {uploads.map((upload) => (
                <button
                  key={upload.id}
                  onClick={() => setActiveUploadId(upload.id)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    activeUploadId === upload.id
                      ? "border-scg-300 bg-scg-50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                        {upload.fileName}
                      </span>
                    </div>
                    <StatusBadge status={upload.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                    <span>{upload.entryCount} entries</span>
                    <span>
                      {new Date(upload.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: Analysis */}
      <div className="lg:col-span-2">
        {activeUploadId ? (
          <AnalyzeTrigger
            key={activeUploadId}
            uploadId={activeUploadId}
            existingAnalysis={
              activeUploadId === latestAnalyzedUploadId
                ? latestAnalysis
                : null
            }
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-20">
            <FileSpreadsheet size={40} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              Upload a timesheet CSV to get started
            </p>
            <p className="mt-1 text-xs text-gray-400">
              AI will extract external counsel patterns and practice area insights
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ANALYZED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
          <CheckCircle2 size={8} />
          Analyzed
        </span>
      );
    case "PROCESSING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          <Loader2 size={8} className="animate-spin" />
          Processing
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
          <AlertTriangle size={8} />
          Failed
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          Pending
        </span>
      );
  }
}
