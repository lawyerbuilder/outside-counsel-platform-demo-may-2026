"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  Sparkles,
  ClipboardPaste,
  PenLine,
  Loader2,
} from "lucide-react";

type FeePhase = { phase: string; fee: string };
type Tab = "paste" | "manual";

export function PublicResponseForm({
  token,
  rfpTitle,
  requestFeeCap,
  requestSuggestedBudget,
  pricingRequirements,
  additionalRequirements,
  scopeDocument,
}: {
  token: string;
  rfpTitle: string;
  requestFeeCap: boolean;
  requestSuggestedBudget: boolean;
  pricingRequirements: string | null;
  additionalRequirements: string | null;
  scopeDocument: string | null;
}) {
  const [tab, setTab] = useState<Tab>("paste");
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);

  const [feeType, setFeeType] = useState("CAPPED");
  const [currency, setCurrency] = useState("THB");
  const [phases, setPhases] = useState<FeePhase[]>([{ phase: "", fee: "" }]);
  const [staffingPlan, setStaffingPlan] = useState("");
  const [responseDocument, setResponseDocument] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addPhase() {
    setPhases((prev) => [...prev, { phase: "", fee: "" }]);
  }
  function removePhase(index: number) {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  }
  function updatePhase(index: number, field: keyof FeePhase, value: string) {
    setPhases((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  const totalFee = phases.reduce((sum, p) => {
    const val = parseFloat(p.fee);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // ── AI extraction ──
  async function handleExtract() {
    if (!pastedText.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch(`/api/respond/${token}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalText: pastedText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Extraction failed");
      }
      const data = await res.json();

      // Populate form fields from extraction
      if (data.feeType) setFeeType(data.feeType);
      if (data.currencyCode) setCurrency(data.currencyCode);
      if (data.phases && data.phases.length > 0) {
        setPhases(
          data.phases.map((p: { phase: string; feeCents: number }) => ({
            phase: p.phase,
            fee: String(p.feeCents / 100),
          }))
        );
      }
      if (data.staffingPlan) setStaffingPlan(data.staffingPlan);
      if (data.narrative) setResponseDocument(data.narrative);

      setExtractionDone(true);
      setTab("manual"); // Switch to manual tab so they can review
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  // ── Submit ──
  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        responseDocument: responseDocument || undefined,
        staffingPlan: staffingPlan || undefined,
      };

      if (totalFee > 0) {
        body.proposedFeeCents = Math.round(totalFee * 100);
        body.proposedFeeType = feeType;
        body.currencyCode = currency;
      }

      const namedPhases = phases.filter(
        (p) => p.phase.trim() && parseFloat(p.fee) > 0
      );
      if (namedPhases.length > 0) {
        body.feeBreakdown = namedPhases.map((p) => ({
          phase: p.phase.trim(),
          feeCents: Math.round(parseFloat(p.fee) * 100),
        }));
      }

      const res = await fetch(`/api/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <CheckCircle2 size={48} className="text-scg-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Proposal submitted
        </h2>
        <p className="text-sm text-gray-500">
          Thank you for responding to <strong>{rfpTitle}</strong>. The SCG Legal
          team will review your proposal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {pricingRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">
            Pricing requirements:
          </p>
          <p className="mt-1 text-sm text-amber-800">{pricingRequirements}</p>
        </div>
      )}
      {additionalRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">
            Additional requirements:
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {additionalRequirements}
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab("paste")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "paste"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ClipboardPaste size={14} />
          Paste proposal
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "manual"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <PenLine size={14} />
          Fill in manually
        </button>
      </div>

      {/* ── Paste tab ── */}
      {tab === "paste" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Paste your proposal text
            </label>
            <p className="text-xs text-gray-400">
              Paste the full text of your fee proposal, staffing plan, or
              engagement letter. AI will extract the structured data for you to
              review.
            </p>
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              setExtractionDone(false);
            }}
            rows={12}
            placeholder="Paste your proposal here..."
            className="w-full surface px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-scg-400 focus:outline-none focus:ring-1 focus:ring-scg-400"
          />
          <button
            onClick={handleExtract}
            disabled={extracting || !pastedText.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-scg-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {extracting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analysing proposal...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Extract with AI
              </>
            )}
          </button>
          {extractionDone && (
            <p className="text-center text-xs text-scg-600">
              Fields populated from your proposal. Switched to manual tab for
              review.
            </p>
          )}
        </div>
      )}

      {/* ── Manual tab ── */}
      {tab === "manual" && (
        <div className="space-y-5">
          {extractionDone && (
            <div className="rounded-lg border border-scg-200 bg-scg-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-scg-700">
                <Sparkles size={12} />
                Fields below were pre-filled by AI. Please review and adjust
                before submitting.
              </p>
            </div>
          )}

          {/* Fee section */}
          {requestFeeCap && (
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Fee proposal by scope / phase
                  </label>
                  <p className="text-xs text-gray-400">
                    Break down your fee by work phase.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                    <option value="SGD">SGD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                  <select
                    value={feeType}
                    onChange={(e) => setFeeType(e.target.value)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    <option value="CAPPED">Capped</option>
                    <option value="FIXED">Fixed</option>
                    <option value="HOURLY">Hourly (with cap)</option>
                    <option value="BLENDED">Blended rate</option>
                    <option value="PHASED_FIXED">Phased fixed</option>
                    <option value="SUCCESS">Success fee</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {phases.map((phase, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={phase.phase}
                      onChange={(e) => updatePhase(i, "phase", e.target.value)}
                      placeholder={
                        i === 0
                          ? "e.g. Due diligence"
                          : i === 1
                          ? "e.g. Transaction execution"
                          : "Phase name"
                      }
                      className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-scg-400 focus:outline-none focus:ring-1 focus:ring-scg-400"
                    />
                    <div className="relative w-44 shrink-0">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={phase.fee}
                        onChange={(e) => updatePhase(i, "fee", e.target.value)}
                        placeholder="Amount"
                        className="w-full rounded-md border border-gray-200 py-2 pl-12 pr-3 text-sm focus:border-scg-400 focus:outline-none focus:ring-1 focus:ring-scg-400"
                      />
                    </div>
                    {phases.length > 1 && (
                      <button
                        onClick={() => removePhase(i)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={addPhase}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-scg-400 hover:text-scg-700"
                >
                  <Plus size={12} />
                  Add phase
                </button>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Total: </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {currency} {totalFee.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Staffing plan */}
          <div className="space-y-1">
            <label
              htmlFor="staffing"
              className="text-sm font-medium text-gray-700"
            >
              Staffing plan
            </label>
            <textarea
              id="staffing"
              value={staffingPlan}
              onChange={(e) => setStaffingPlan(e.target.value)}
              placeholder="Describe the team: lead partner, associates, paralegals. Include seniority levels and estimated hours."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-scg-400 focus:outline-none focus:ring-1 focus:ring-scg-400"
            />
          </div>

          {/* Narrative */}
          <div className="space-y-1">
            <label
              htmlFor="narrative"
              className="text-sm font-medium text-gray-700"
            >
              Proposal narrative
            </label>
            <textarea
              id="narrative"
              value={responseDocument}
              onChange={(e) => setResponseDocument(e.target.value)}
              placeholder="Describe your approach, relevant experience, proposed timeline, and any conditions or assumptions."
              rows={6}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-scg-400 focus:outline-none focus:ring-1 focus:ring-scg-400"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-scg-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Send size={14} />
              {submitting ? "Submitting..." : "Submit proposal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
