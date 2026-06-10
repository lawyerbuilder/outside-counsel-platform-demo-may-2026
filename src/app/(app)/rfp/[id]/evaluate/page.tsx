import { notFound } from "next/navigation";
import { getRfpWithInvitations } from "@/server/rfp/queries";
import { getFeeBenchmark, computeFeeDelta } from "@/server/rfp/benchmarking";
import { PageHeader } from "@/components/shared/PageHeader";
import { EvaluationForm } from "./evaluation-form";

export const dynamic = "force-dynamic";

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rfp = await getRfpWithInvitations(id);
  if (!rfp) notFound();

  let criteria: Array<{ name: string; weight: number }> = [];
  try {
    criteria = JSON.parse(rfp.evaluationCriteria ?? "[]");
  } catch {
    criteria = [];
  }

  const benchmark = await getFeeBenchmark(rfp.practiceAreaId, rfp.jurisdictionId);

  const invitations = rfp.invitations
    .filter((inv) => inv.status === "SUBMITTED" || inv.status === "SCORED")
    .map((inv) => ({
      id: inv.id,
      firmName: inv.firm.name,
      firmType: inv.firm.firmType,
      proposedFeeCents: inv.proposedFeeCents,
      currencyCode: inv.currencyCode,
      proposedFeeType: inv.proposedFeeType,
      staffingPlan: inv.staffingPlan,
      responseDocument: inv.responseDocument,
      feeBreakdown: inv.feeBreakdown,
      benchmarkDelta: computeFeeDelta(inv.proposedFeeCents, benchmark),
      existingScores: inv.evaluations.map((ev) => ({
        criterionName: ev.criterionName,
        score: ev.score,
        comment: ev.comment,
      })),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Evaluate: ${rfp.title}`}
        description="Score each firm on the evaluation criteria"
      />
      <EvaluationForm
        rfpId={id}
        criteria={criteria}
        invitations={invitations}
      />
    </div>
  );
}
