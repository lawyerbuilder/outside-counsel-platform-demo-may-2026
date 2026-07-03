"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CheckCircle2, Send, Plus, Trash2, Upload, Loader2, Sparkles } from "lucide-react";

type FeePhase = { phase: string; fee: string };

type ExtractedProposal = {
  feeType?: string;
  currencyCode?: string;
  phases?: { phase: string; feeCents: number }[];
  staffingPlan?: string;
  narrative?: string;
};

export function FirmResponseForm({
  invitationId,
  rfpId,
  requestFeeCap,
  requestSuggestedBudget,
  pricingRequirements,
  additionalRequirements,
  canUploadForFirm,
  initial,
}: {
  invitationId: string;
  rfpId: string;
  requestFeeCap: boolean;
  requestSuggestedBudget: boolean;
  pricingRequirements: string | null;
  additionalRequirements: string | null;
  canUploadForFirm: boolean;
  initial?: {
    feeType?: string;
    currency?: string;
    phases?: FeePhase[];
    staffingPlan?: string;
    responseDocument?: string;
  };
}) {
  const router = useRouter();
  const [feeType, setFeeType] = useState(initial?.feeType ?? "CAPPED");
  const [currency, setCurrency] = useState(initial?.currency ?? "THB");
  const [phases, setPhases] = useState<FeePhase[]>(
    initial?.phases && initial.phases.length > 0
      ? initial.phases
      : [{ phase: "", fee: "" }]
  );
  const [staffingPlan, setStaffingPlan] = useState(initial?.staffingPlan ?? "");
  const [responseDocument, setResponseDocument] = useState(initial?.responseDocument ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [extractionDone, setExtractionDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function populateFromExtraction(data: ExtractedProposal) {
    if (data.feeType) setFeeType(data.feeType);
    if (data.currencyCode) setCurrency(data.currencyCode);
    if (data.phases && data.phases.length > 0) {
      setPhases(
        data.phases.map((p) => ({ phase: p.phase, fee: String(p.feeCents / 100) }))
      );
    }
    if (data.staffingPlan) setStaffingPlan(data.staffingPlan);
    if (data.narrative) setResponseDocument(data.narrative);
    setExtractionDone(true);
  }

  // Manager/admin uploads the PDF/Word proposal a firm emailed to the team.
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/rfp/${rfpId}/respond/${invitationId}/extract-file`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not read that file");
      }
      const data = await res.json();
      populateFromExtraction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Calculate total from phases
  const totalFee = phases.reduce((sum, p) => {
    const val = parseFloat(p.fee);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Check if any phase has a name (means user is using phased pricing)
  const hasNamedPhases = phases.some((p) => p.phase.trim() !== "");

  async function handleSubmit() {
    setSubmitting(true);
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

      // Build fee breakdown if phases have names
      const namedPhases = phases.filter(
        (p) => p.phase.trim() && parseFloat(p.fee) > 0
      );
      if (namedPhases.length > 0) {
        body.feeBreakdown = namedPhases.map((p) => ({
          phase: p.phase.trim(),
          feeCents: Math.round(parseFloat(p.fee) * 100),
        }));
      }

      const res = await fetch(`/api/rfp/${rfpId}/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => router.push(`/rfp/${rfpId}`), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <CheckCircle2 size={48} className="text-scg-600" />
        <h2 className="text-xl font-semibold text-gray-900">Response submitted</h2>
        <p className="text-sm text-gray-500">Redirecting to RFP detail...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {pricingRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">Pricing requirements from requestor:</p>
          <p className="mt-1 text-sm text-amber-800">{pricingRequirements}</p>
        </div>
      )}

      {additionalRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">Additional requirements:</p>
          <p className="mt-1 text-sm text-amber-800">{additionalRequirements}</p>
        </div>
      )}

      {/* Upload on the firm's behalf (manager / admin only) */}
      {canUploadForFirm && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <div>
            <Label className="text-sm font-medium">
              Upload the proposal the firm sent
            </Label>
            <p className="text-xs text-gray-400">
              Upload the PDF or Word file the firm emailed to the team. AI will
              read it and fill in the fields below for you to review.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-scg-400 hover:text-scg-700 disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Reading {uploadName}...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span className="font-medium">Choose a file to upload</span>
                <span className="text-xs text-gray-400">
                  PDF or Word (.docx), up to 8 MB.
                </span>
              </>
            )}
          </button>
          {extractionDone && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-scg-700">
              <Sparkles size={12} />
              Fields below were pre-filled from the file. Please review and
              adjust before submitting.
            </p>
          )}
        </div>
      )}

      {requestFeeCap && (
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Fee proposal by scope / phase</Label>
              <p className="text-xs text-gray-400">
                Break down your fee by work phase. Name each phase (e.g. &quot;Pre-merger advisory&quot;, &quot;Implementation&quot;, &quot;Post-merger integration&quot;).
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

          {/* Phase rows */}
          <div className="space-y-2">
            {phases.map((phase, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={phase.phase}
                  onChange={(e) => updatePhase(i, "phase", e.target.value)}
                  placeholder={
                    i === 0
                      ? "e.g. Pre-merger advisory"
                      : i === 1
                      ? "e.g. Implementation / execution"
                      : "e.g. Post-merger integration"
                  }
                  className="flex-1 text-sm"
                />
                <div className="relative w-44 shrink-0">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    value={phase.fee}
                    onChange={(e) => updatePhase(i, "fee", e.target.value)}
                    placeholder="Amount"
                    className="pl-12 text-sm"
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

      <div className="space-y-1">
        <Label htmlFor="staffing">Staffing plan</Label>
        <Textarea
          id="staffing"
          value={staffingPlan}
          onChange={(e) => setStaffingPlan(e.target.value)}
          placeholder="Describe the team: lead partner, associates, paralegals. Include seniority levels and estimated hours per person."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="response">Proposal / response narrative</Label>
        <Textarea
          id="response"
          value={responseDocument}
          onChange={(e) => setResponseDocument(e.target.value)}
          placeholder="Describe your approach, relevant experience, proposed timeline, and any conditions or assumptions."
          rows={6}
          className="resize-none"
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
          className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-6 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          <Send size={14} />
          {submitting ? "Submitting..." : "Submit response"}
        </button>
      </div>
    </div>
  );
}
