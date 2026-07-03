import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { updateInvitationResponse } from "@/server/rfp/mutations";
import { invitationResponseSchema } from "@/lib/validation/rfp";
import { shouldAutoGenerate, generateComparisonReport } from "@/server/rfp/comparison";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/respond/[token]
 * Public — fetch the invitation + RFP context for a given response token.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: invitation.id,
    status: invitation.status,
    firmName: invitation.firm.name,
    rfp: invitation.rfp,
  });
}

/**
 * POST /api/respond/[token]
 * Public — submit a proposal response for the given token.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Public endpoint: same per-token limiter as the extract sibling.
  const rl = checkRateLimit(`respond:${token}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  // Look up the invitation by token
  const invitation = await prisma.rfpInvitation.findUnique({
    where: { responseToken: token },
    select: { id: true, rfpId: true, status: true },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (invitation.status !== "INVITED") {
    return NextResponse.json(
      { error: "This invitation has already been responded to" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = invitationResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 400 }
    );
  }

  const updated = await updateInvitationResponse(invitation.id, parsed.data);

  // Trigger auto-comparison if all firms have responded
  const autoGen = await shouldAutoGenerate(invitation.rfpId);
  if (autoGen) {
    generateComparisonReport(invitation.rfpId, "system").catch(() => {});
  }

  return NextResponse.json({ ok: true, invitationId: updated.id });
}
