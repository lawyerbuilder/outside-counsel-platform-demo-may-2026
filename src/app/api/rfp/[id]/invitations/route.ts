import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendInvitations, submitForApproval } from "@/server/rfp/mutations";
import { getDemoRole } from "@/server/demo-role";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invitations = await prisma.rfpInvitation.findMany({
    where: { rfpId: id },
    include: {
      firm: { select: { id: true, name: true, firmType: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(invitations);
}

const sendSchema = z.object({
  firmIds: z.array(z.string()).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const role = await getDemoRole();
  if (role === "LAWYER") {
    await submitForApproval(id, parsed.data.firmIds);
    return NextResponse.json({ ok: true, pendingApproval: true }, { status: 201 });
  }
  await sendInvitations(id, parsed.data.firmIds);
  return NextResponse.json({ ok: true }, { status: 201 });
}
