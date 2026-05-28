import { notFound } from "next/navigation";
import Link from "next/link";
import { getRfpWithInvitations } from "@/server/rfp/queries";
import { getLatestComparison } from "@/server/rfp/comparison";
import { PageHeader } from "@/components/shared/PageHeader";
import { RfpStatusBadge } from "@/components/rfp/RfpStatusBadge";
import { InvitationStatusTracker } from "@/components/rfp/InvitationStatusTracker";
import { ComparisonSection } from "@/components/rfp/ComparisonSection";

export const dynamic = "force-dynamic";

export default async function RfpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rfp = await getRfpWithInvitations(id);
  if (!rfp) notFound();

  const comparison = await getLatestComparison(id);

  let criteria: Array<{ name: string; weight: number }> = [];
  try {
    criteria = JSON.parse(rfp.evaluationCriteria ?? "[]");
  } catch {
    criteria = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfp.title}
        description={`${rfp.practiceArea?.name ?? "—"} · ${rfp.jurisdiction?.name ?? "—"}`}
        action={<RfpStatusBadge status={rfp.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Scope */}
          {rfp.scopeDocument && (
            <section className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700">Scope of Work</h2>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {rfp.scopeDocument}
              </p>
            </section>
          )}

          {/* Invitations */}
          <section className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Firm Responses ({rfp.invitations.length})
              </h2>
              {rfp.status !== "DRAFT" && rfp.status !== "CANCELLED" && (
                <Link
                  href={`/rfp/${id}/evaluate`}
                  className="text-xs text-scg-700 hover:text-scg-800"
                >
                  Evaluate firms
                </Link>
              )}
            </div>
            <div className="mt-3">
              <InvitationStatusTracker
                rfpId={id}
                rfpTitle={rfp.title}
                invitations={rfp.invitations.map((inv) => ({
                  id: inv.id,
                  firmName: inv.firm.name,
                  status: inv.status,
                  respondedAt: inv.respondedAt?.toISOString() ?? null,
                }))}
              />
            </div>
          </section>

          {/* AI Comparison & Coach */}
          <ComparisonSection
            rfpId={id}
            rfpTitle={rfp.title}
            rfpSubtitle={`${rfp.practiceArea?.name ?? ""} · ${rfp.jurisdiction?.name ?? ""}`}
            initialReport={comparison?.response ?? null}
            generatedAt={comparison?.createdAt?.toISOString() ?? null}
            hasSubmittedResponses={rfp.invitations.some((inv) => inv.status === "SUBMITTED")}
          />
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Details
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Created by</dt>
                <dd className="font-medium text-gray-900">{rfp.createdBy?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Deadline</dt>
                <dd className="font-medium text-gray-900">
                  {rfp.deadline ? new Date(rfp.deadline).toLocaleDateString() : "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Fee cap requested</dt>
                <dd className="font-medium text-gray-900">{rfp.requestFeeCap ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Budget estimate requested</dt>
                <dd className="font-medium text-gray-900">{rfp.requestSuggestedBudget ? "Yes" : "No"}</dd>
              </div>
              {rfp.matterNumber && (
                <div>
                  <dt className="text-gray-500">Matter No.</dt>
                  <dd className="font-medium text-gray-900">{rfp.matterNumber}</dd>
                </div>
              )}
            </dl>
          </section>

          {criteria.length > 0 && (
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Evaluation Criteria
              </h3>
              <ul className="mt-3 space-y-1">
                {criteria.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{c.name}</span>
                    <span className="text-gray-400">{c.weight}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
