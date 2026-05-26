"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CheckCircle2, Send } from "lucide-react";

export function FirmResponseForm({
  invitationId,
  rfpId,
  requestFeeCap,
  requestSuggestedBudget,
  pricingRequirements,
  additionalRequirements,
}: {
  invitationId: string;
  rfpId: string;
  requestFeeCap: boolean;
  requestSuggestedBudget: boolean;
  pricingRequirements: string | null;
  additionalRequirements: string | null;
}) {
  const router = useRouter();
  const [feeCapAmount, setFeeCapAmount] = useState("");
  const [feeType, setFeeType] = useState("CAPPED");
  const [currency, setCurrency] = useState("THB");
  const [staffingPlan, setStaffingPlan] = useState("");
  const [responseDocument, setResponseDocument] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        responseDocument: responseDocument || undefined,
        staffingPlan: staffingPlan || undefined,
      };

      if (feeCapAmount) {
        body.proposedFeeCents = Math.round(parseFloat(feeCapAmount) * 100);
        body.proposedFeeType = feeType;
        body.currencyCode = currency;
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

      {requestFeeCap && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <Label className="text-sm font-medium">Proposed fee cap</Label>
          <p className="text-xs text-gray-400">
            Enter the maximum fee you are proposing for this matter.
          </p>
          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="THB">THB</option>
              <option value="USD">USD</option>
              <option value="SGD">SGD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
            <Input
              type="number"
              value={feeCapAmount}
              onChange={(e) => setFeeCapAmount(e.target.value)}
              placeholder="e.g., 500000"
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500">Fee type:</Label>
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
