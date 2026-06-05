import { NextRequest, NextResponse } from "next/server";
import { getRfp } from "@/server/rfp/queries";
import { updateDraftRfp } from "@/server/rfp/mutations";
import { prisma } from "@/server/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rfp = await getRfp(id);
  if (!rfp) {
    return NextResponse.json({ error: "RFP not found" }, { status: 404 });
  }
  return NextResponse.json(rfp);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const rfp = await updateDraftRfp(id, body);
  return NextResponse.json(rfp);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rfp = await getRfp(id);
  if (!rfp) {
    return NextResponse.json({ error: "RFP not found" }, { status: 404 });
  }

  // Only allow deleting DRAFT or CANCELLED RFPs
  if (!["DRAFT", "CANCELLED"].includes(rfp.status)) {
    return NextResponse.json(
      { error: `Cannot delete an RFP with status ${rfp.status}. Only DRAFT or CANCELLED RFPs can be deleted.` },
      { status: 400 }
    );
  }

  // Delete related records first (invitations, evaluations), then the RFP
  await prisma.$transaction([
    prisma.rfpEvaluation.deleteMany({ where: { invitation: { rfpId: id } } }),
    prisma.rfpInvitation.deleteMany({ where: { rfpId: id } }),
    prisma.rfp.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
