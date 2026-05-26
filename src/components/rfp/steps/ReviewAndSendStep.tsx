"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Send } from "lucide-react";

type ReviewData = {
  costCenterCode: string;
  costCenterName: string;
  contactPersons: string;
  jurisdictionName: string;
  practiceAreaName: string;
  complexityTier: string;
  urgency: string;
  title: string;
  matterNumber?: string;
  scopeDocument?: string;
  deadline?: string;
  firmCount: number;
  firmNames: string[];
  requestFeeCap: boolean;
  requestSuggestedBudget: boolean;
  additionalRequirements?: string;
};

export function ReviewAndSendStep({
  data,
  onSend,
}: {
  data: ReviewData;
  draftId?: string;
  onSend: () => Promise<void>;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await onSend();
      setSent(true);
      setTimeout(() => {
        router.push("/rfp");
      }, 2000);
    } catch (e) {
      setSending(false);
      setError(e instanceof Error ? e.message : "Failed to send invitations. Please try again.");
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <CheckCircle2 size={48} className="text-scg-600" />
        <h2 className="text-xl font-semibold text-gray-900">Invitations sent!</h2>
        <p className="text-sm text-gray-500">
          {data.firmCount} firm(s) have been invited. Redirecting to RFP list...
        </p>
      </div>
    );
  }

  let contacts: Array<{ name: string; email: string; role?: string }> = [];
  try {
    contacts = JSON.parse(data.contactPersons);
  } catch { /* empty */ }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Cost center", value: `${data.costCenterCode} — ${data.costCenterName}` },
    { label: "Jurisdiction", value: data.jurisdictionName },
    { label: "Practice area", value: data.practiceAreaName },
    { label: "Complexity", value: data.complexityTier },
    { label: "Urgency", value: data.urgency },
    { label: "Title", value: data.title },
    ...(data.matterNumber ? [{ label: "Matter No.", value: data.matterNumber }] : []),
    { label: "Deadline", value: data.deadline ?? "Not set" },
    { label: "Firms invited", value: `${data.firmCount} firm(s)` },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-base font-medium">Review &amp; Send</Label>
        <p className="mt-1 text-sm text-gray-500">
          Confirm the details before sending invitations to selected firms.
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center px-4 py-3">
            <span className="w-40 text-sm font-medium text-gray-500">{row.label}</span>
            <span className="text-sm text-gray-900">{row.value}</span>
          </div>
        ))}
      </div>

      {contacts.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-gray-500">BU contact(s)</Label>
          <div className="mt-1 space-y-1">
            {contacts.map((c, i) => (
              <div key={i} className="text-sm text-gray-700">
                {c.name} ({c.email}){c.role ? ` — ${c.role}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.scopeDocument && (
        <div>
          <Label className="text-sm font-medium text-gray-500">Scope of work</Label>
          <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
            {data.scopeDocument}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {data.firmNames.map((name) => (
          <Badge key={name} variant="outline" className="text-xs">
            {name}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {data.requestFeeCap && <span className="rounded bg-scg-50 px-2 py-1 text-scg-700">Fee cap requested</span>}
        {data.requestSuggestedBudget && <span className="rounded bg-scg-50 px-2 py-1 text-scg-700">Budget estimate requested</span>}
        {data.additionalRequirements && <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">Additional requirements attached</span>}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-6 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          <Send size={14} />
          {sending ? "Sending..." : "Send invitations"}
        </button>
      </div>
    </div>
  );
}
