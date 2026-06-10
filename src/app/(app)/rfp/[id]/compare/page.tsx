import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRfpWithInvitations } from "@/server/rfp/queries";
import { getLatestKeyDifferences } from "@/server/rfp/comparison";
import { getFeeBenchmark, computeFeeDelta } from "@/server/rfp/benchmarking";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { FeeBenchmarkBadge } from "@/components/rfp/FeeBenchmarkBadge";
import { KeyDifferencesSection } from "@/components/rfp/KeyDifferencesSection";
import { RfpStatusBadge } from "@/components/rfp/RfpStatusBadge";

export const dynamic = "force-dynamic";

type FeePhase = { phase: string; feeCents: number };

const RESPONDED = ["SUBMITTED", "SCORED", "SHORTLISTED", "SELECTED"];

function parsePhases(json: string | null): FeePhase[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStaffing(json: string | null): string {
  if (!json) return "—";
  try {
    const plan = JSON.parse(json);
    if (typeof plan === "string") return plan;
    return [plan.partner, plan.associates, plan.note].filter(Boolean).join("\n");
  } catch {
    return json;
  }
}

function fmtMoney(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  return `${currency} ${(cents / 100).toLocaleString()}`;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rfp = await getRfpWithInvitations(id);
  if (!rfp) notFound();

  const invitations = rfp.invitations.filter((inv) => RESPONDED.includes(inv.status));
  const benchmark = await getFeeBenchmark(rfp.practiceAreaId, rfp.jurisdictionId);
  const keyDiff = await getLatestKeyDifferences(id);

  // Union of all phases across proposals, preserving first-seen order
  const phaseNames: string[] = [];
  const phasesByInv = new Map<string, Map<string, number>>();
  for (const inv of invitations) {
    const phases = parsePhases(inv.feeBreakdown);
    const map = new Map<string, number>();
    for (const p of phases) {
      if (!phaseNames.includes(p.phase)) phaseNames.push(p.phase);
      map.set(p.phase, p.feeCents);
    }
    phasesByInv.set(inv.id, map);
  }
  // Cheapest fee per phase for highlighting
  const cheapestByPhase = new Map<string, number>();
  for (const phase of phaseNames) {
    const fees = invitations
      .map((inv) => phasesByInv.get(inv.id)?.get(phase))
      .filter((v): v is number => v != null);
    if (fees.length > 0) cheapestByPhase.set(phase, Math.min(...fees));
  }
  const cheapestTotal = invitations.length
    ? Math.min(...invitations.map((i) => i.proposedFeeCents ?? Infinity))
    : null;

  // Weighted evaluation score per invitation (if evaluations exist)
  function weightedScore(inv: (typeof invitations)[number]): string {
    if (inv.evaluations.length === 0) return "—";
    const total = inv.evaluations.reduce(
      (sum, ev) => sum + ev.score * (ev.criterionWeight / 100),
      0
    );
    return `${total.toFixed(1)} / 5.0`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Compare: ${rfp.title}`}
        description={`${rfp.practiceArea?.name ?? "—"} · ${rfp.jurisdiction?.name ?? "—"} · ${invitations.length} proposal(s)`}
        action={<RfpStatusBadge status={rfp.status} />}
      />

      <Link
        href={`/rfp/${id}`}
        className="inline-flex items-center gap-1 text-xs text-scg-700 hover:text-scg-800"
      >
        <ArrowLeft size={12} />
        Back to RFP
      </Link>

      {invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No submitted proposals yet. The comparison appears once firms respond.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-500">
                    &nbsp;
                  </th>
                  {invitations.map((inv) => (
                    <th key={inv.id} className="min-w-[220px] px-4 py-3">
                      <Link
                        href={`/firms/${inv.firm.id}`}
                        className="font-semibold text-scg-700 hover:text-scg-800"
                      >
                        {inv.firm.name}
                      </Link>
                      <div className="mt-1 flex gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {inv.firm.firmType}
                        </Badge>
                        <Badge
                          variant={inv.firm.panelStatus === "ACTIVE" ? "green" : "gray"}
                          className="text-[10px]"
                        >
                          {inv.firm.panelStatus}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                    Total fee
                  </td>
                  {invitations.map((inv) => (
                    <td key={inv.id} className="px-4 py-3 align-top">
                      <span
                        className={
                          inv.proposedFeeCents === cheapestTotal
                            ? "font-semibold text-green-700"
                            : "font-medium text-gray-900"
                        }
                      >
                        {fmtMoney(inv.proposedFeeCents, inv.currencyCode ?? "USD")}
                      </span>
                      <div className="mt-1">
                        <FeeBenchmarkBadge
                          delta={computeFeeDelta(inv.proposedFeeCents, benchmark)}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                    Fee type
                  </td>
                  {invitations.map((inv) => (
                    <td key={inv.id} className="px-4 py-3 text-gray-700">
                      {inv.proposedFeeType?.replace(/_/g, " ") ?? "—"}
                    </td>
                  ))}
                </tr>
                {phaseNames.map((phase) => (
                  <tr key={phase}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-gray-500">
                      {phase}
                    </td>
                    {invitations.map((inv) => {
                      const fee = phasesByInv.get(inv.id)?.get(phase);
                      const isCheapest = fee != null && fee === cheapestByPhase.get(phase);
                      return (
                        <td
                          key={inv.id}
                          className={`px-4 py-3 ${
                            isCheapest ? "font-semibold text-green-700" : "text-gray-700"
                          }`}
                        >
                          {fee != null ? fmtMoney(fee, inv.currencyCode ?? "USD") : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                    Staffing
                  </td>
                  {invitations.map((inv) => (
                    <td key={inv.id} className="px-4 py-3 text-xs text-gray-600 whitespace-pre-wrap align-top">
                      {parseStaffing(inv.staffingPlan)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                    AI disclosure
                  </td>
                  {invitations.map((inv) => (
                    <td key={inv.id} className="px-4 py-3 text-xs text-gray-600 align-top">
                      {inv.aiDisclosure ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                    Key terms
                  </td>
                  {invitations.map((inv) => (
                    <td key={inv.id} className="px-4 py-3 text-xs text-gray-600 align-top">
                      <details>
                        <summary className="cursor-pointer text-scg-700">
                          {(inv.responseDocument ?? "—").slice(0, 140)}
                          {(inv.responseDocument?.length ?? 0) > 140 ? "…" : ""}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap">{inv.responseDocument}</p>
                      </details>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                    Evaluation score
                  </td>
                  {invitations.map((inv) => (
                    <td key={inv.id} className="px-4 py-3 font-medium text-gray-900">
                      {weightedScore(inv)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <KeyDifferencesSection
            rfpId={id}
            initialSummary={keyDiff?.response ?? null}
            generatedAt={keyDiff?.createdAt?.toISOString() ?? null}
          />
        </>
      )}
    </div>
  );
}
