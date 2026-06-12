"use client";

import { useActionState, useState, useEffect } from "react";
import { FileText, PenLine, Upload, Loader2, Sparkles } from "lucide-react";
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

interface NewEngagementFormProps {
  firms: { id: string; name: string; shortName: string | null }[];
  lawyers: { id: string; name: string }[];
  jurisdictions: { id: string; name: string }[];
}

type AiExtracted = {
  matterNo: string;
  matterName: string;
  matterType: MatterTypeEnum;
  firmName: string;
  firmId: string;
  lawyerName: string;
  lawyerId: string;
  entityName: string;
  startDate: string;
  endDate: string;
  totalFeesUsd: string;
  outcome: EngagementOutcomeEnum;
  notes: string;
};

export function NewEngagementForm({
  firms,
  lawyers,
  jurisdictions,
}: NewEngagementFormProps) {
  const [mode, setMode] = useState<"manual" | "upload">("manual");
  const [state, formAction, isPending] = useActionState<InsightActionState, FormData>(
    addEngagementAction,
    { success: false }
  );

  // AI upload state
  const [docText, setDocText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<Partial<AiExtracted> | null>(null);

  useEffect(() => {
    if (state.success) {
      // Redirect after successful creation
      window.location.href = "/engagements";
    }
  }, [state.success]);

  const handleExtract = async () => {
    if (!docText.trim()) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch("/api/engagements/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: docText.trim(),
          firms: firms.map((f) => ({ id: f.id, name: f.name, shortName: f.shortName })),
          lawyers: lawyers.map((l) => ({ id: l.id, name: l.name })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? "Extraction failed");
        return;
      }

      setPrefilled(data.extracted);
      setMode("manual"); // Switch to form with prefilled data
    } catch {
      setExtractError("Network error — please try again");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setMode("manual")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            mode === "manual"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <PenLine size={16} />
          Manual Entry
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            mode === "upload"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles size={16} />
          AI Extract from Document
        </button>
      </div>

      {/* AI Upload mode */}
      {mode === "upload" && (
        <div className="surface p-6">
          <div className="mb-4 flex items-start gap-3">
            <FileText size={20} className="mt-0.5 text-scg-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Extract from Engagement Agreement
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Paste the text of an engagement letter or agreement below. The AI
                will extract the firm name, matter details, fee arrangements, and
                dates — then pre-fill the form for your review.
              </p>
            </div>
          </div>

          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
            placeholder="Paste the engagement letter or agreement text here..."
          />

          {extractError && (
            <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {extractError}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleExtract}
              disabled={isExtracting || !docText.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-scg-600 px-6 py-2 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Extract & Pre-fill Form
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual form (also shown after AI extraction with prefilled data) */}
      {mode === "manual" && (
        <div className="surface p-6">
          {prefilled && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <Sparkles size={14} className="mr-1 inline" />
              Form pre-filled from document. Review and adjust before saving.
            </div>
          )}

          <form action={formAction}>
            {/* Row 1: Matter Name + Matter No */}
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Matter Name *
                </label>
                <input
                  type="text"
                  name="matterName"
                  required
                  defaultValue={prefilled?.matterName ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                  placeholder="e.g. SCG Chemicals JV Dispute"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Matter No.
                </label>
                <input
                  type="text"
                  name="matterNo"
                  defaultValue={prefilled?.matterNo ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                  placeholder="e.g. MS-2024-0123"
                />
              </div>
            </div>

            {/* Row 2: Firm + Lead Lawyer */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Firm *
                </label>
                <select
                  name="firmId"
                  required
                  defaultValue={prefilled?.firmId ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                >
                  <option value="">Select firm...</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.shortName ?? f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Lead Lawyer
                </label>
                <select
                  name="lawyerId"
                  defaultValue={prefilled?.lawyerId ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                >
                  <option value="">None</option>
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Matter Type + Outcome */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Matter Type *
                </label>
                <select
                  name="matterType"
                  required
                  defaultValue={prefilled?.matterType ?? "ADVISORY"}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Outcome
                </label>
                <select
                  name="outcome"
                  defaultValue={prefilled?.outcome ?? "ONGOING"}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
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

            {/* Row 4: Start Date + End Date */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  defaultValue={prefilled?.startDate ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={prefilled?.endDate ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                />
              </div>
            </div>

            {/* Row 5: Jurisdiction + SCG Entity */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Jurisdiction
                </label>
                <select
                  name="jurisdictionId"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                >
                  <option value="">Any</option>
                  {jurisdictions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  SCG Entity
                </label>
                <input
                  type="text"
                  name="entityName"
                  defaultValue={prefilled?.entityName ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                  placeholder="e.g. SCG Chemicals"
                />
              </div>
            </div>

            {/* Row 6: Total Fees */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Total Fees (USD)
              </label>
              <input
                type="number"
                name="totalFeesUsd"
                min="0"
                defaultValue={prefilled?.totalFeesUsd ?? ""}
                className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                placeholder="e.g. 50000"
              />
              <p className="mt-1 text-xs text-gray-400">Amount in USD cents (e.g. 5000000 = $50,000)</p>
            </div>

            {/* Row 7: Notes */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={prefilled?.notes ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
                placeholder="Any additional context about this engagement..."
              />
            </div>

            {state.error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-scg-700 px-6 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Create Engagement"}
              </button>
              <a
                href="/engagements"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </a>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
