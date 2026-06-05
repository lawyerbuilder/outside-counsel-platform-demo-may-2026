import { randomUUID } from "crypto";
import { prisma } from "@/server/db";
import type { DraftRfpInput, InvitationResponseInput, EvaluationScoreInput } from "@/lib/validation/rfp";
import { sendRfpInvitationEmail } from "@/server/email";

export async function createDraftRfp(
  data: DraftRfpInput & { createdById: string }
) {
  return prisma.rfp.create({
    data: {
      title: data.title ?? "Untitled RFP",
      practiceAreaId: data.practiceAreaId || null,
      jurisdictionId: data.jurisdictionId || null,
      costCenterId: data.costCenterId || null,
      contactPersons: data.contactPersons,
      matterNumber: data.matterNumber,
      status: "DRAFT",
      scopeDocument: data.scopeDocument,
      pricingRequirements: data.pricingRequirements,
      evaluationCriteria: data.evaluationCriteria,
      requestFeeCap: data.requestFeeCap ?? true,
      requestSuggestedBudget: data.requestSuggestedBudget ?? true,
      additionalRequirements: data.additionalRequirements,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      createdById: data.createdById,
    },
  });
}

export async function updateDraftRfp(
  id: string,
  data: Partial<DraftRfpInput>
) {
  return prisma.rfp.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.practiceAreaId !== undefined ? { practiceAreaId: data.practiceAreaId } : {}),
      ...(data.jurisdictionId !== undefined ? { jurisdictionId: data.jurisdictionId } : {}),
      ...(data.scopeDocument !== undefined ? { scopeDocument: data.scopeDocument } : {}),
      ...(data.pricingRequirements !== undefined ? { pricingRequirements: data.pricingRequirements } : {}),
      ...(data.evaluationCriteria !== undefined ? { evaluationCriteria: data.evaluationCriteria } : {}),
      ...(data.costCenterId !== undefined ? { costCenterId: data.costCenterId } : {}),
      ...(data.contactPersons !== undefined ? { contactPersons: data.contactPersons } : {}),
      ...(data.matterNumber !== undefined ? { matterNumber: data.matterNumber } : {}),
      ...(data.requestFeeCap !== undefined ? { requestFeeCap: data.requestFeeCap } : {}),
      ...(data.requestSuggestedBudget !== undefined ? { requestSuggestedBudget: data.requestSuggestedBudget } : {}),
      ...(data.additionalRequirements !== undefined ? { additionalRequirements: data.additionalRequirements } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline ? new Date(data.deadline) : null } : {}),
    },
  });
}

export async function sendInvitations(rfpId: string, firmIds: string[]) {
  // 1. Create invitation records with unique tokens
  await prisma.$transaction(async (tx) => {
    for (const firmId of firmIds) {
      await tx.rfpInvitation.upsert({
        where: { rfpId_firmId: { rfpId, firmId } },
        create: { rfpId, firmId, status: "INVITED", responseToken: randomUUID() },
        update: {},
      });
    }
    await tx.rfp.update({
      where: { id: rfpId },
      data: { status: "OPEN" },
    });
  });

  // 2. Send emails to each firm (non-blocking — don't fail if emails fail)
  try {
    const rfp = await prisma.rfp.findUnique({
      where: { id: rfpId },
      include: {
        practiceArea: { select: { name: true } },
        jurisdiction: { select: { name: true } },
        invitations: {
          include: {
            firm: { select: { name: true, website: true, contacts: { take: 1, select: { email: true } } } },
          },
        },
      },
    });

    if (!rfp) return;

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXTAUTH_URL ?? "http://localhost:3001";

    for (const inv of rfp.invitations) {
      if (!inv.responseToken) continue;

      // Find the firm's email: try FirmContact first, then fall back to a constructed address
      const firmEmail = inv.firm.contacts?.[0]?.email
        ?? (inv.firm.website
          ? `info@${new URL(inv.firm.website).hostname.replace("www.", "")}`
          : null);

      if (!firmEmail) {
        console.log(`[Email] No email for ${inv.firm.name} — skipping`);
        continue;
      }

      const portalUrl = `${baseUrl}/respond/${inv.responseToken}`;

      await sendRfpInvitationEmail({
        to: firmEmail,
        firmName: inv.firm.name,
        rfpTitle: rfp.title,
        practiceArea: rfp.practiceArea?.name ?? "General",
        jurisdiction: rfp.jurisdiction?.name ?? "—",
        deadline: rfp.deadline?.toISOString() ?? null,
        scopeOfWork: rfp.scopeDocument ?? "See attached scope document.",
        portalUrl,
      });
    }
  } catch (err) {
    // Don't fail the RFP creation if emails fail
    console.error("[Email] Error sending invitations:", err);
  }
}

export async function getOrCreateResponseToken(invitationId: string): Promise<string> {
  const inv = await prisma.rfpInvitation.findUniqueOrThrow({
    where: { id: invitationId },
  });
  if (inv.responseToken) return inv.responseToken;
  const token = randomUUID();
  await prisma.rfpInvitation.update({
    where: { id: invitationId },
    data: { responseToken: token },
  });
  return token;
}

export async function updateInvitationResponse(
  invitationId: string,
  data: InvitationResponseInput
) {
  const invitation = await prisma.rfpInvitation.update({
    where: { id: invitationId },
    data: {
      status: "SUBMITTED",
      respondedAt: new Date(),
      proposedFeeCents: data.proposedFeeCents,
      proposedFeeType: data.proposedFeeType,
      currencyCode: data.currencyCode,
      feeBreakdown: data.feeBreakdown ? JSON.stringify(data.feeBreakdown) : null,
      staffingPlan: data.staffingPlan,
      responseDocument: data.responseDocument,
      aiDisclosure: data.aiDisclosure,
    },
  });

  return invitation;
}

export async function scoreInvitation(
  invitationId: string,
  evaluatorId: string,
  scores: EvaluationScoreInput[]
) {
  await prisma.$transaction(async (tx) => {
    for (const score of scores) {
      await tx.rfpEvaluation.upsert({
        where: {
          invitationId_evaluatorId_criterionName: {
            invitationId,
            evaluatorId,
            criterionName: score.criterionName,
          },
        },
        create: {
          invitationId,
          evaluatorId,
          criterionName: score.criterionName,
          criterionWeight: score.criterionWeight,
          score: score.score,
          comment: score.comment,
        },
        update: {
          score: score.score,
          comment: score.comment,
        },
      });
    }
    await tx.rfpInvitation.update({
      where: { id: invitationId },
      data: { status: "SCORED" },
    });
  });
}

export async function shortlistFirms(rfpId: string, invitationIds: string[]) {
  await prisma.$transaction(async (tx) => {
    const allInvitations = await tx.rfpInvitation.findMany({
      where: { rfpId },
      select: { id: true },
    });
    for (const inv of allInvitations) {
      const newStatus = invitationIds.includes(inv.id) ? "SHORTLISTED" : "UNSUCCESSFUL";
      await tx.rfpInvitation.update({
        where: { id: inv.id },
        data: { status: newStatus },
      });
    }
    await tx.rfp.update({
      where: { id: rfpId },
      data: { status: "SHORTLISTED" },
    });
  });
}

export async function selectWinner(rfpId: string, invitationId: string) {
  await prisma.$transaction(async (tx) => {
    const allInvitations = await tx.rfpInvitation.findMany({
      where: { rfpId },
      select: { id: true },
    });
    for (const inv of allInvitations) {
      const newStatus = inv.id === invitationId ? "SELECTED" : "UNSUCCESSFUL";
      await tx.rfpInvitation.update({
        where: { id: inv.id },
        data: { status: newStatus },
      });
    }
    await tx.rfp.update({
      where: { id: rfpId },
      data: { status: "CLOSED" },
    });
  });
}

export async function cancelRfp(rfpId: string) {
  return prisma.rfp.update({
    where: { id: rfpId },
    data: { status: "CANCELLED" },
  });
}
