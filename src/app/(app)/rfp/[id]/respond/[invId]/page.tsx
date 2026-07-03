import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { getDemoRole } from "@/server/demo-role";
import {
  CopyLinkButton,
  CopyDraftButton,
  CopyPortalLinkButton,
} from "@/components/rfp/CopyLinkButton";
import { FirmResponseForm } from "./response-form";

export const dynamic = "force-dynamic";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ id: string; invId: string }>;
}) {
  const { id, invId } = await params;
  const role = await getDemoRole();
  const canUploadForFirm = role === "MANAGER" || role === "ADMIN";

  const invitation = await prisma.rfpInvitation.findUnique({
    where: { id: invId },
    include: {
      firm: { select: { name: true } },
      rfp: {
        select: {
          title: true,
          requestFeeCap: true,
          requestSuggestedBudget: true,
          scopeDocument: true,
          pricingRequirements: true,
          additionalRequirements: true,
        },
      },
    },
  });

  if (!invitation || invitation.rfpId !== id) notFound();

  // If the firm has already responded, load what they submitted so the page
  // shows their proposal (view / edit) rather than a blank form.
  let initialPhases: { phase: string; fee: string }[] | undefined;
  try {
    if (invitation.feeBreakdown) {
      const parsed = JSON.parse(invitation.feeBreakdown) as { phase: string; feeCents: number }[];
      initialPhases = parsed.map((p) => ({ phase: p.phase, fee: String(p.feeCents / 100) }));
    }
  } catch {
    initialPhases = undefined;
  }
  const hasResponse = invitation.status !== "INVITED" && invitation.status !== "DECLINED";
  const initial = {
    feeType: invitation.proposedFeeType ?? undefined,
    currency: invitation.currencyCode ?? undefined,
    phases: initialPhases,
    staffingPlan: invitation.staffingPlan ?? undefined,
    responseDocument: invitation.responseDocument ?? undefined,
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/rfp/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-scg-700"
      >
        <ArrowLeft size={14} />
        Back to RFP
      </Link>

      <PageHeader
        title={invitation.firm.name}
        description={`${invitation.rfp.title}`}
        action={
          <Badge variant="outline" className="text-xs">
            {hasResponse ? "Response received" : "Awaiting response"}
          </Badge>
        }
      />

      {/* Actions for this firm on this matter */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3">
        <span className="mr-1 text-xs font-medium text-gray-500">
          Send the invitation:
        </span>
        <CopyLinkButton
          rfpId={id}
          invitationId={invId}
          rfpTitle={invitation.rfp.title}
          firmName={invitation.firm.name}
        />
        <CopyDraftButton
          rfpId={id}
          invitationId={invId}
          rfpTitle={invitation.rfp.title}
          firmName={invitation.firm.name}
        />
        <CopyPortalLinkButton rfpId={id} invitationId={invId} />
      </div>

      {invitation.rfp.scopeDocument && (
        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Scope of Work
          </h3>
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
            {invitation.rfp.scopeDocument}
          </p>
        </section>
      )}

      <FirmResponseForm
        invitationId={invId}
        rfpId={id}
        requestFeeCap={invitation.rfp.requestFeeCap}
        requestSuggestedBudget={invitation.rfp.requestSuggestedBudget}
        pricingRequirements={invitation.rfp.pricingRequirements}
        additionalRequirements={invitation.rfp.additionalRequirements}
        canUploadForFirm={canUploadForFirm}
        initial={initial}
      />
    </div>
  );
}
