"use client";

import { ReviewAndSendStep } from "@/components/rfp/steps/ReviewAndSendStep";

type Props = {
  params: Record<string, string | string[] | undefined>;
  draftId?: string;
  firmNameMap?: Record<string, string>;
  manualFirmNames?: string[];
};

function str(val: string | string[] | undefined): string {
  return typeof val === "string" ? val : "";
}

export function ReviewAndSendClient({ params, firmNameMap = {}, manualFirmNames = [] }: Props) {
  const firmIds = str(params.firmIds).split(",").filter(Boolean);
  // Deduplicate: manual firm names that already matched a DB firm appear in both
  // firmIds (as resolved IDs) and manualFirmNames. Remove duplicates by name.
  const firmNamesFromIds = firmIds.map((id) => firmNameMap[id] ?? id);
  const resolvedNameSet = new Set(firmNamesFromIds.map((n) => n.toLowerCase()));
  const uniqueManualNames = manualFirmNames.filter(
    (name) => !resolvedNameSet.has(name.toLowerCase())
  );
  const allFirmNames = [...firmNamesFromIds, ...uniqueManualNames];

  const data = {
    costCenterCode: str(params.costCenterCode) || "—",
    costCenterName: str(params.costCenterName) || "—",
    contactPersons: str(params.contactPersons) || "[]",
    jurisdictionName: str(params.jurisdictionName) || str(params.jurisdictionId) || "—",
    practiceAreaName: str(params.practiceAreaName) || str(params.practiceAreaId) || "—",
    complexityTier: str(params.complexityTier) || "STANDARD",
    urgency: str(params.urgency) || "ROUTINE",
    title: str(params.title) || "Untitled RFP",
    matterNumber: str(params.matterNumber) || undefined,
    scopeDocument: str(params.scopeDocument) || undefined,
    deadline: str(params.deadline) || undefined,
    firmCount: allFirmNames.length,
    firmNames: allFirmNames,
    requestFeeCap: params.requestFeeCap !== "false",
    requestSuggestedBudget: params.requestSuggestedBudget !== "false",
    additionalRequirements: str(params.additionalRequirements) || undefined,
  };

  async function handleSend() {
    const practiceAreaId = str(params.practiceAreaId);
    const jurisdictionId = str(params.jurisdictionId);
    const costCenterId = str(params.costCenterId);

    if (!practiceAreaId || practiceAreaId === "__other__") {
      throw new Error("Practice area is required. Please go back and select one.");
    }
    if (!jurisdictionId || jurisdictionId === "__other__") {
      throw new Error("Jurisdiction is required. Please go back and select one.");
    }

    const body = {
      title: data.title,
      practiceAreaId,
      jurisdictionId,
      costCenterId: costCenterId || undefined,
      contactPersons: data.contactPersons,
      matterNumber: data.matterNumber,
      complexityTier: data.complexityTier,
      urgency: data.urgency,
      scopeDocument: data.scopeDocument,
      pricingRequirements: str(params.pricingRequirements) || undefined,
      evaluationCriteria: str(params.evaluationCriteria) || undefined,
      deadline: data.deadline,
      requestFeeCap: data.requestFeeCap,
      requestSuggestedBudget: data.requestSuggestedBudget,
      additionalRequirements: data.additionalRequirements,
      firmIds,
    };

    const res = await fetch("/api/rfp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? "Failed to create RFP. Please check all fields and try again.");
    }
  }

  return <ReviewAndSendStep data={data} onSend={handleSend} />;
}
