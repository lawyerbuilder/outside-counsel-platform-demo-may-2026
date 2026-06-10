import { NextRequest, NextResponse } from "next/server";
import { listRfps } from "@/server/rfp/queries";
import { createDraftRfp, sendInvitations, submitForApproval } from "@/server/rfp/mutations";
import { getDemoRole } from "@/server/demo-role";
import { getCurrentUserId } from "./current-user";
import { z } from "zod";

const createRfpSchema = z.object({
  title: z.string().min(1).optional(),
  practiceAreaId: z.string().optional(),
  jurisdictionId: z.string().optional(),
  costCenterId: z.string().optional(),
  contactPersons: z.string().optional(),
  matterNumber: z.string().optional(),
  complexityTier: z.string().optional(),
  urgency: z.string().optional(),
  scopeDocument: z.string().optional(),
  pricingRequirements: z.string().optional(),
  evaluationCriteria: z.string().optional(),
  requestFeeCap: z.boolean().optional(),
  requestSuggestedBudget: z.boolean().optional(),
  additionalRequirements: z.string().optional(),
  deadline: z.string().optional(),
  firmIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const rfps = await listRfps(
    status ? { status: status as Parameters<typeof listRfps>[0] extends infer T ? T extends { status?: infer S } ? S : never : never } : undefined
  );
  return NextResponse.json(rfps);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createRfpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  const rfp = await createDraftRfp({
    title: data.title,
    practiceAreaId: data.practiceAreaId,
    jurisdictionId: data.jurisdictionId,
    costCenterId: data.costCenterId,
    contactPersons: data.contactPersons,
    matterNumber: data.matterNumber,
    scopeDocument: data.scopeDocument,
    pricingRequirements: data.pricingRequirements,
    evaluationCriteria: data.evaluationCriteria,
    requestFeeCap: data.requestFeeCap,
    requestSuggestedBudget: data.requestSuggestedBudget,
    additionalRequirements: data.additionalRequirements,
    deadline: data.deadline,
    createdById: await getCurrentUserId(),
  });

  let pendingApproval = false;
  if (data.firmIds && data.firmIds.length > 0) {
    const role = await getDemoRole();
    if (role === "LAWYER") {
      // Lawyers' RFPs wait for manager approval before any email goes out
      await submitForApproval(rfp.id, data.firmIds);
      pendingApproval = true;
    } else {
      await sendInvitations(rfp.id, data.firmIds);
    }
  }

  // rfp was captured before invitations updated its status; reflect the final state
  const finalStatus = pendingApproval
    ? "PENDING_APPROVAL"
    : data.firmIds && data.firmIds.length > 0
      ? "OPEN"
      : rfp.status;

  return NextResponse.json({ ...rfp, status: finalStatus, pendingApproval }, { status: 201 });
}
