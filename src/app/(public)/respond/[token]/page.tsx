import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PublicResponseForm } from "./public-response-form";

export default async function PublicRespondPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.rfpInvitation.findUnique({
    where: { responseToken: token },
    include: {
      firm: { select: { id: true, name: true } },
      rfp: {
        select: {
          id: true,
          title: true,
          scopeDocument: true,
          pricingRequirements: true,
          additionalRequirements: true,
          requestFeeCap: true,
          requestSuggestedBudget: true,
          deadline: true,
          evaluationCriteria: true,
          practiceArea: { select: { name: true } },
          jurisdiction: { select: { name: true } },
        },
      },
    },
  });

  if (!invitation) return notFound();

  // Already submitted
  if (invitation.status !== "INVITED") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-scg-50">
          <svg
            className="h-8 w-8 text-scg-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          Response already submitted
        </h1>
        <p className="text-sm text-gray-500">
          Your proposal for <strong>{invitation.rfp.title}</strong> has already
          been received. Thank you.
        </p>
      </div>
    );
  }

  const rfp = invitation.rfp;
  const deadlineStr = rfp.deadline
    ? new Date(rfp.deadline).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* RFP context banner */}
      <div className="surface p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-scg-600">
          Request for Proposal
        </p>
        <h1 className="mt-1 text-lg font-semibold text-gray-900">
          {rfp.title}
        </h1>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          {rfp.practiceArea?.name && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5">
              {rfp.practiceArea.name}
            </span>
          )}
          {rfp.jurisdiction?.name && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5">
              {rfp.jurisdiction.name}
            </span>
          )}
          {deadlineStr && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700">
              Deadline: {deadlineStr}
            </span>
          )}
        </div>

        {rfp.scopeDocument && (
          <div className="mt-4 rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-600">Scope</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
              {rfp.scopeDocument}
            </p>
          </div>
        )}
      </div>

      <div className="surface p-5 shadow-sm">
        <p className="mb-1 text-xs text-gray-400">
          Responding as <strong className="text-gray-700">{invitation.firm.name}</strong>
        </p>

        <PublicResponseForm
          token={token}
          rfpTitle={rfp.title}
          requestFeeCap={rfp.requestFeeCap}
          requestSuggestedBudget={rfp.requestSuggestedBudget}
          pricingRequirements={rfp.pricingRequirements}
          additionalRequirements={rfp.additionalRequirements}
          scopeDocument={rfp.scopeDocument}
        />
      </div>
    </div>
  );
}
